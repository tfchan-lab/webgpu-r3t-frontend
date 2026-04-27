import { TextStreamer, full, env, } from '@xenova/transformers';
import TranslationPipeline from './TranslationPipeline';

// Configure ONNX runtime
env.backends.onnx.wasm = { numThreads: 4, wasmPaths: 'https://202.45.47.52:3002/ort-wasm/' };

let processing = false;
async function translate({ text, src_lang, tgt_lang }) {
    if (processing) return;
    processing = true; // Lock the model instance

    // Retrieve the tokenizer and model
    const [tokenizer, model] = await TranslationPipeline.getInstance();

    try {
        // Get the target language token ID
        const tgtLangTokenId = tokenizer.encode(tgt_lang)[1];

        // Tokenize the input text
        const { input_ids, attention_mask } = tokenizer(text, {
            return_tensors: 'np',
            max_length: 512,
            truncation: true,
        });

        const output = await model.generate({
			input_ids: input_ids,
			attention_mask: attention_mask,
            forced_bos_token_id: tgtLangTokenId, // Force the target language
            max_length: 300, // default: 512
            num_beams: 5,
            early_stopping: true,
			//do_sample: true, 
			//temperature: 0.1,
            callback_function: (x) => {
                // Decode partial output and send it to the main thread
                if (x && x[0] && x[0].output_token_ids) {
                    const partialOutput = tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true });
                    self.postMessage({
                        status: 'update',
                        output: partialOutput,
                    });
                }
            },
        });

        const bigIntArray = output[0].ort_tensor.cpuData;
		const intArray = Array.from(bigIntArray, (bigIntValue) => Number(bigIntValue));
		const finalOutput = tokenizer.decode(intArray, { skip_special_tokens: true });

        self.postMessage({
            status: 'translate_complete',
            output: finalOutput,
        });
    } catch (error) {
        self.postMessage({
            status: 'error',
			data: error.message,
        });
		//console.warn(error.message)
    } finally {
        processing = false; // Release the lock
    }
}

let loaded = false;
async function load() {
    if (loaded) return;
    loaded = true;

    // Notify the main thread that loading has started
    self.postMessage({
        status: 'loading',
        data: '[Worker] Loading model...'
    });

	// Load the model and tokenizer
	const [tokenizer, model] = await TranslationPipeline.getInstance(x => {
		// Forward progress updates to the main thread
		self.postMessage(x);
	});

	// Notify the main thread that the model is loaded
	self.postMessage({
		status: 'loading',
		data: '[Worker] Model loaded.',
	});
	
	// This is a warm-up run to compile and cache the shaders
	const dummyText = '你好，世界！';
	
	const tgt_lang = 'eng_Latn';
	const tgtLangTokenId = tokenizer.encode(tgt_lang)[1];
	
	const { input_ids, attention_mask } = tokenizer(dummyText, { return_tensors: 'np', max_length: 512, truncation: true});
	
	console.log('[Model] Warm-up task: ', dummyText);
	
	const output = await model.generate({
		input_ids: input_ids,
		attention_mask: attention_mask,
		forced_bos_token_id: tgtLangTokenId,
		max_length: 10,
		num_beams: 5,
		early_stopping: true,
	});
	
	const bigIntArray = output[0].ort_tensor.cpuData;
	const intArray = Array.from(bigIntArray, (bigIntValue) => Number(bigIntValue));
	
	const finalOutput = tokenizer.decode(intArray, { skip_special_tokens: true });
	console.log('[Model] Warm-up result: ', finalOutput);

	// Notify the main thread that the model is ready
	self.postMessage({ status: 'ready', workerType: 'translation' });
}

self.addEventListener('message', async(e) => {
	const { type, data } = e.data;
	
	switch(type) {
		case 'load':
			load();
			break;
		case 'translate':
			translate(data);
			break;
	}
});