import { pipeline, TextStreamer, full, env, } from '@huggingface/transformers';

// Configure ONNX runtime
// Note: env.wasm.numThreads >1 will not work without crossOriginIsolated enabled.
// Reference: https://web.dev/articles/cross-origin-isolation-guide?utm_source=devtools&utm_campaign=stable
env.backends.onnx.wasm = { numThreads: 4, wasmPaths: 'https://' + import.meta.env.VITE_LAN_IP + ':3002/ort-wasm/' };

let processing = false;
let translator = null;

async function translate({ text, src_lang, tgt_lang }) {
    if (processing) return;
    processing = true; // Lock the model instance

    try {
        // Notify the main thread that translation has started
        //self.postMessage({ status: 'translate_start' });

        // Run the translation pipeline
        const output = await translator(text, {
            //src_lang: src_lang,
            tgt_lang: tgt_lang,
            max_length: 300, // default: 512
            num_beams: 5,
            early_stopping: true,
            //do_sample: true, 
            //temperature: 0.1,
            callback_function: (x) => {
                // Decode partial output and send it to the main thread
                if (x && x[0] && x[0].translation_text) {
                    self.postMessage({
                        status: 'update',
                        output: x[0].translation_text,
                    });
                }
            },
        });

        // Send the final output back to the main thread
        self.postMessage({
            status: 'translate_complete',
            output: output[0].translation_text,
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

	// Load the translation pipeline
    translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', {
        device: 'wasm',
        dtype: {
            encoder_model: 'q8', // wasm: q8
            decoder_model_merged: 'q8', // wasm: q8
        },
        progress_callback: (progress) => {
            // Forward progress updates to the main thread
            self.postMessage({
                status: 'progress',
                data: progress,
            });
        },
    });

	// Notify the main thread that the model is loaded
	self.postMessage({
		status: 'loading',
		data: '[Worker] Model loaded.',
	});
	
	// This is a warm-up run to compile and cache the shaders
	const dummyText = '你好，世界！';
	const src_lang = 'zho_Hant';
	const tgt_lang = 'eng_Latn';
	
	console.log('[Model] Warm-up task: ', dummyText);
	
	const output = await translator(dummyText, {
		src_lang: src_lang,
		tgt_lang: tgt_lang,
		max_length: 10,
		num_beams: 5,
		early_stopping: true,
	});
	
	console.log('[Model] Warm-up result: ', output[0].translation_text);

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