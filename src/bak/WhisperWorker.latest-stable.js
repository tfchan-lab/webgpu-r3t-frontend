import { TextStreamer, full, env, } from '@xenova/transformers';
import AutomaticSpeechRecognitionPipeline from './AutomaticSpeechRecognitionPipeline';

// Configure ONNX runtime
env.backends.onnx.wasm = { numThreads: 4, wasmPaths: 'https://202.45.47.52:3002/ort-wasm/' };

const MAX_NEW_TOKENS = 64;

let processing = false;
async function generate({ audio, language }) {
    if (processing) return;
    processing = true;

    // Tell the main thread we are starting
    self.postMessage({ status: 'whisper_start' });

    // Retrieve the text-generation pipeline.
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();

    let startTime;
    let numTokens = 0;
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
    }

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function,
    });

    const inputs = await processor(audio);
	
    const outputs = await model.generate({
        ...inputs,
        max_new_tokens: MAX_NEW_TOKENS,
		chunk_length_s: 30,
		stride_length_s: 5,
		//return_timestamps: true, // Word-level timestamp in groups
        language,
        streamer,
    });

    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });

    // Send the output back to the main thread
    self.postMessage({
        status: 'whisper_complete',
        output: outputText,
    });
    processing = false;
}

async function load(data) {
	const { device, modelIndex } = data;
	
    self.postMessage({
        status: 'loading',
        data: 'Loading model...',
    });

    // Load the pipeline and save it for future use.
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(x => {
        // Add workerType to the progress message
        self.postMessage(x);
    }, device, modelIndex);

    self.postMessage({
        status: 'loading',
        data: 'Compiling shaders and warming up model...'
    });
	
	var melBins = 80;
	if (modelIndex == 3) {
		melBins = 128;
	}

    // Run model with dummy input to compile shaders
    await model.generate({
        input_features: full([1, melBins, 3000], 0.0), // 80 bins, 128 bins for large/turbo
        max_new_tokens: 1,
		language: "en",
    });
    self.postMessage({ status: 'ready'}); // Add workerType
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
    }
});