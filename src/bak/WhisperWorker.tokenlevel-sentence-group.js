import { TextStreamer, full, env } from '@xenova/transformers';
import AutomaticSpeechRecognitionPipeline from './AutomaticSpeechRecognitionPipeline';

// Configure ONNX runtime
env.backends.onnx.wasm = { numThreads: 4, wasmPaths: 'https://202.45.47.52:3002/ort-wasm/' };

const MAX_NEW_TOKENS = 128;
const punctuationTokens = [13, 0, 30, 7323, 3259, 485, 20111, 93]; // ',' -> 11 ';' -> 26

let processing = false;
let tokenizer;

async function generate({ audio, language, wPrompt }) {
    if (processing) return;
    processing = true;

    // Tell the main thread we are starting
    self.postMessage({ status: 'whisper_start' });

    // Retrieve the text-generation pipeline.
    const [_tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();
    tokenizer = _tokenizer;

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
    };

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
		prompt: 'For short sentence, do not terminate with fullstop immediately. Merge it with next sentence(s) with comma or semi-colon.',
        language,
        streamer,
    });

    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });

    const bigIntArray = outputs[0].ort_tensor.cpuData;
    const intArray = Array.from(bigIntArray, (bigIntValue) => Number(bigIntValue));

    // Send the raw output text and tokens back to the main thread immediately
    self.postMessage({
        status: 'whisper_raw_complete',
        output: outputText,
        outputTokens: intArray,
    });
	
	console.log('Raw Text: ', outputText[0]);

    // Perform deduplication and punctuation detection asynchronously
    setTimeout(() => {
        let dedupeTokens = intArray.filter((token) => {
			return !(token >= 50000);
		});
		console.log('Output Tokens without tags: ', dedupeTokens);

        if (wPrompt) {
			// Iterate through each group in wPrompt
			for (const group of wPrompt) {
				const wPromptTokens = group; // Current group of tokens
				console.log('Current Group Tokens: ', wPromptTokens);

				let maxMatchLength = 0; // Track the length of the largest match
				let sliceIndex = 0; // Track the index to slice dedupeTokens

				// Combined loop for suffix and prefix checks
				for (let i = dedupeTokens.length; i >= 0; i--) {
					const beginTokens = dedupeTokens.slice(0, i);
					const wPromptSuffix = wPromptTokens.slice(-i);
					const wPromptPrefix = wPromptTokens.slice(0, i);

					// Check for suffix match
					let suffixMatch = true;
					if (wPromptSuffix.length === beginTokens.length) {
						for (let j = 0; j < beginTokens.length; j++) {
							if (wPromptSuffix[j] !== beginTokens[j]) {
								suffixMatch = false;
								break;
							}
						}
					} else {
						suffixMatch = false;
					}

					// Check for prefix match
					let prefixMatch = true;
					if (wPromptPrefix.length === beginTokens.length) {
						for (let j = 0; j < beginTokens.length; j++) {
							if (wPromptPrefix[j] !== beginTokens[j]) {
								prefixMatch = false;
								break;
							}
						}
					} else {
						prefixMatch = false;
					}

					// Update maxMatchLength and sliceIndex for prefix match
					if (prefixMatch && i > maxMatchLength) {
						maxMatchLength = i;
						sliceIndex = i; // Slice at the end of the prefix match
					}

					// Update maxMatchLength and sliceIndex for suffix match
					if (suffixMatch && i > maxMatchLength) {
						maxMatchLength = i;
						sliceIndex = -i; // Slice at the start of the suffix match
					}
				}

				// Dedupe the tokens based on the largest match for the current group
				if (maxMatchLength > 0) {
					if (sliceIndex < 0) {
						// Suffix match: slice at -i
						dedupeTokens = dedupeTokens.slice(-sliceIndex);
					} else {
						// Prefix match: slice at i
						dedupeTokens = dedupeTokens.slice(0, sliceIndex);
					}
					//console.log('Deduplicated Tokens: ', dedupeTokens);
				}
			}
		}
		
		console.log('Deduped Tokens: ', dedupeTokens);

        // Decode tokens to check for numeric values
        const isDecimalPoint = (token, prevToken, nextToken) => {
            const prevText = tokenizer.decode([prevToken], { skip_special_tokens: true });
            const nextText = tokenizer.decode([nextToken], { skip_special_tokens: true });
            return token === 13 && !isNaN(prevText) && !isNaN(nextText);
        };

		let remainingTokens = [...dedupeTokens]; // Copy of dedupeTokens to process
		let allSentences = []; // Array to store all segmented sentences
		let updatedWPrompt = [...wPrompt]; // Initialize wPrompt

		// Recursively segment sentences until all tokens are processed
		while (remainingTokens.length > 0) {
			// Find the first punctuation mark in the remaining tokens
			let sentenceEndIndex = remainingTokens.findIndex(token => punctuationTokens.includes(token));

			if (sentenceEndIndex !== -1) {
				// Group tokens up to the punctuation mark (including the punctuation)
				const sentenceTokens = remainingTokens.slice(0, sentenceEndIndex + 1);
				//console.log('Sentence Tokens: ', sentenceTokens);

				// Decode the sentence tokens to text
				const dedupeText = tokenizer.decode(sentenceTokens, { skip_special_tokens: true });
				//console.log('Retrieved Sentence: ', dedupeText.trimStart());

				// Add the sentence to the allSentences array
				allSentences.push(dedupeText.trimStart());

				// Update wPrompt
				if (updatedWPrompt.length >= 5) {
					updatedWPrompt.shift();
				}
				updatedWPrompt.push(sentenceTokens);

				// Remove the processed tokens from remainingTokens
				remainingTokens = remainingTokens.slice(sentenceEndIndex + 1);
			} else {
				break;
			}
		}
		
		if (allSentences.length === 0) return;
		
		console.log('Retrieved sentences: ', allSentences.join(' '));

		// Send all segmented sentences back to the main app
		self.postMessage({
			status: 'whisper_dedupe_complete',
			output: allSentences.join(' '), // Combine all sentences into a single string
			updatedWPrompt: updatedWPrompt,
		});
    }, 0); // Use setTimeout to make deduplication asynchronous

    processing = false;
}

async function load(data) {
    const { device, modelIndex } = data;

    self.postMessage({
        status: 'loading',
        data: 'Loading model...',
    });

    // Load the pipeline and save it for future use.
    const [_tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(x => {
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
    self.postMessage({ status: 'ready' }); // Add workerType
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