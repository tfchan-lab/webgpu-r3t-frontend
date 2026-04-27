import { InferenceSession, Tensor } from 'onnxruntime-web';
import { AutoTokenizer, AutoModelForSeq2SeqLM } from '@xenova/transformers';

// Translation Pipeline
class TranslationPipeline {
	static instance = null;
    //static model_id = 'Xenova/nllb-200-distilled-600M';
	static model_id = '820391839201z/nllb-200-distilled-600M-onnx'; // debug for webgpu q8
    static tokenizer = null;
    static model = null;

    static async getInstance(progress_callback = null) {
		if (this.instance === null) {
            this.instance = new TranslationPipeline();
            await this.instance.init(progress_callback);
        }
        return Promise.all([this.instance.tokenizer, this.instance.model]);
    }

    async init(progress_callback) {
        try {
            this.tokenizer ??= await AutoTokenizer.from_pretrained(this.constructor.model_id, {
                progress_callback,
            });
            this.model ??= await AutoModelForSeq2SeqLM.from_pretrained(this.constructor.model_id, {
                dtype: {
                    encoder_model: 'q4', // fp32, fp16, q8 work too
                    decoder_model_merged: 'q4', // fp16, q8(webgpu) is broken
                },
                device: 'wasm', // both wasm and webgpu work
                progress_callback,
            });
        } catch (error) {
            console.error('Error during load:', error);
            self.postMessage({
                status: 'error',
                error: error.message || error.toString(),
            });
        }
    }
}

export default TranslationPipeline;