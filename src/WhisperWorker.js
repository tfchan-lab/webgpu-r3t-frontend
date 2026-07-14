import { pipeline, TextStreamer, full, env } from '@huggingface/transformers';

// Configure ONNX runtime
env.backends.onnx.wasm = { numThreads: 4, wasmPaths: 'https://' + import.meta.env.VITE_LAN_IP + ':3002/ort-wasm/' };

const MAX_NEW_TOKENS = 64;
const scores = [0, 0, 0, 0]; // Add entry here after adding model

let processing = false;
let transcriber = null;

// --- Helper function for calculating token bag-of-words cosine similarity ---
function computeTokenCosineSimilarity(tokensA, tokensB) {
    if (!tokensA || !tokensB || !tokensA.length || !tokensB.length) return 0;

    const freqA = {};
    const freqB = {};
    const allTokens = new Set([...tokensA, ...tokensB]);

    for (const t of tokensA) freqA[t] = (freqA[t] || 0) + 1;
    for (const t of tokensB) freqB[t] = (freqB[t] || 0) + 1;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const t of allTokens) {
        const valA = freqA[t] || 0;
        const valB = freqB[t] || 0;

        dotProduct += valA * valB;
        magnitudeA += valA * valA;
        magnitudeB += valB * valB;
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

async function generate({ audio, language, previousText }) {
    if (processing) return;
    processing = true;

    // Tell the main thread we are starting
    self.postMessage({ status: 'whisper_start' });

    let startTime;
    let numTokens = 0;

    // Define a callback function for streaming updates
    const callback_function = (output) => {
        startTime ??= performance.now();

        let tps;
        if (numTokens++ > 0) {
            tps = numTokens / (performance.now() - startTime) * 1000;
        }

        self.postMessage({
            status: 'update',
            output, tps, numTokens,
        });
    };

    const streamer = new TextStreamer(transcriber.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function,
    });

    // Run the transcriber with streaming enabled
    const output = await transcriber(audio, {
        max_new_tokens: MAX_NEW_TOKENS,
        chunk_length_s: 30,
        stride_length_s: 5,
        language,
        streamer,
    });

    const currentText = output.text || '';
    let similarityScore = null;

    // Compute experimental token cosine similarity if previous window text is provided
    if (previousText && previousText.trim() && currentText.trim()) {
        try {
            const tokensPrev = transcriber.tokenizer.encode(previousText);
            const tokensCurr = transcriber.tokenizer.encode(currentText);
            similarityScore = computeTokenCosineSimilarity(tokensPrev, tokensCurr);
        } catch (err) {
            console.error("[WhisperWorker] Error computing token similarity metrics:", err);
        }
    }

    // Send the final output back to the main thread along with the similarity metric
    self.postMessage({
        status: 'whisper_complete',
        output: [currentText],
        similarity: similarityScore
    });

    processing = false;
}

async function load(data) {
    const { device, modelIndex } = data;

    self.postMessage({
        status: 'loading',
        data: 'Loading model...',
    });

    const model_id = ['onnx-community/whisper-tiny', 'onnx-community/whisper-base', 'onnx-community/whisper-small', 'onnx-community/whisper-large-v3-turbo'][modelIndex];

    transcriber = await pipeline('automatic-speech-recognition', model_id, {
        device: device,
        dtype: {
			encoder_model: 'q4', // q8(webgpu) is broken
			decoder_model_merged: 'q4', // fp16, q8(webgpu) is broken
		},
		progress_callback: (progress) => {
            self.postMessage({
                status: 'progress',
                data: progress,
            });
        },
    });

    self.postMessage({
        status: 'loading',
        data: 'Compiling shaders and warming up model...'
    });
	
	var melBins = 80;
	if (modelIndex == 3) {
		melBins = 128;
	}

    // Run model with dummy input to compile shaders
    await transcriber.model.generate({
		input_features: full([1, melBins, 3000], 0.0), // 80 bins, 128 bins for large/turbo
        max_new_tokens: 1,
        language: "en",
    });

    self.postMessage({ status: 'ready' });
}

function benchmark_calcWER(truth, hypothesis) {
    const truthWords = truth.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase();
    const hypothesisWords = hypothesis.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase();

    const dp = Array.from({ length: truthWords.length + 1 }, () => Array(hypothesisWords.length + 1).fill(0));

    for (let i = 0; i <= truthWords.length; i++) {
        for (let j = 0; j <= hypothesisWords.length; j++) {
            if (i === 0) dp[i][j] = j;
            else if (j === 0) dp[i][j] = i;
            else dp[i][j] = Math.min(
                dp[i - 1][j] + 1, // Deletion
                dp[i][j - 1] + 1, // Insertion
                dp[i - 1][j - 1] + (truthWords[i - 1] === hypothesisWords[j - 1] ? 0 : 1) // Substitution
            );
        }
    }

    return dp[truthWords.length][hypothesisWords.length] / truthWords.length;
}

async function benchmark(data) {
    const { device, modelIndex, audio } = data;

    const groundTruth = "AI models can't cross this line boundary and we don't know why. As we train an AI model, its error rate generally drops off quickly and then levels off. If we train a larger model, it will achieve a lower error rate but requires more compute. Scaling to larger and larger models, we end up with a family of curves like this. Switching our axis to logarithmic scales, a clear trend emerges where no model can cross this line, known as the compute optimal or compute efficient frontier.";
    const language = "en";
    const modelName = ["Whisper Tiny", "Whisper Base", "Whisper Small", "Whisper Turbo"]; // Add model here

    self.postMessage({ status: 'benchmark_start' });

    let startIndex = 0;
    let endIndex = modelName.length;

    if (modelIndex !== -1) {
        startIndex = modelIndex;
        endIndex = modelIndex + 1;
    }

    for (let i = startIndex; i < endIndex; i++) {
        console.log(`[Worker] Starting ${modelName[i]} benchmark.`);

        const model_id = ['onnx-community/whisper-tiny', 'onnx-community/whisper-base', 'onnx-community/whisper-small', 'onnx-community/whisper-large-v3-turbo'][i];

        const benchmarkTranscriber = await pipeline('automatic-speech-recognition', model_id, {
            device,
            dtype: {
				encoder_model: 'q4', // q8(webgpu) is broken
				decoder_model_merged: 'q4', // fp16, q8(webgpu) is broken
			},
			progress_callback: (progress) => {
                self.postMessage({
                    status: 'progress',
                    data: progress,
                });
            },
        });
		
		// Run model with dummy input to compile shaders
        await benchmarkTranscriber.model.generate({
			input_features: full([1, modelName[i] !== "Whisper Turbo" ? 80 : 128, 3000], 0.0),
            max_new_tokens: 1,
            language: "en",
        });

        const startTime = performance.now();
        const output = await benchmarkTranscriber(audio, {
            max_new_tokens: 128,
            chunk_length_s: 30,
            stride_length_s: 0,
            language,
        });
        const endTime = performance.now();

        const duration = (endTime - startTime) / 1000; // Convert to seconds
        const tps = output.text.split(' ').length / duration;

        // Calculate accuracy (Word Error Rate)
        const wer = benchmark_calcWER(groundTruth, output.text);

        console.log(`[Worker] ${modelName[i]} benchmark completed in ${duration.toFixed(2)} seconds.`);
        console.log(`[Worker] ${modelName[i]} benchmark speed: ${tps.toFixed(2)} tokens per second.`);
        console.log(`[Worker] ${modelName[i]} benchmark result: ${output.text}`);
        console.log(`[Worker] ${modelName[i]} benchmark Word Error Rate (WER): ${(wer * 100).toFixed(2)}%`);

        const score = tps.toFixed(2) * (1 - wer) / 20 * 100;
        scores[i] = score;
        console.log(`[Worker] ${modelName[i]} benchmark score: ${score.toFixed(0)}`);

        self.postMessage({ status: 'benchmark_update', data: { scores } });

        // Dispose of the transcriber to free up resources
        await benchmarkTranscriber.dispose();
    }
    self.postMessage({ status: 'benchmark_complete' });
}

// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            load(data);
            break;

        case 'generate':
            generate(data);
            break;

        case 'benchmark':
            benchmark(data);
            break;
    }
});