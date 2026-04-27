import React, { useState, useEffect } from "react";
import SystemMonitor from "./SystemMonitor";

const WelcomeScreen = ({ status, setStatus, setReady, backend, WhisperWorker, TranslateWorker, useLocalTranslation, setUseLocalTranslation, useLocalTranscription, setUseLocalTranscription }) => {
	const [whisperModel, setWhisperModel] = useState('tiny'); // Default to whisper-tiny
	
	// For main menu model selector and information text
	const WHISPER_MODELS = {
		tiny: {
			href: "https://huggingface.co/onnx-community/whisper-tiny",
			parameters: "39 million",
		},
		base: {
			href: "https://huggingface.co/onnx-community/whisper-base",
			parameters: "74 million",
		},
		small: {
			href: "https://huggingface.co/onnx-community/whisper-small",
			parameters: "244 million",
		},
		"large-v3-turbo": {
			href: "https://huggingface.co/onnx-community/whisper-large-v3-turbo",
			parameters: "809 million",
		},
	};
	
	return (
		<>
			{status === null && (
				<>
					{/* Descriptions before loading */}
					<p className="max-w-[480px] mb-4">
						<br />
						You are about to load{' '}
						<a
							href={WHISPER_MODELS[whisperModel].href}
							target="_blank"
							rel="noreferrer"
							className="font-medium underline"
						>
							whisper-{whisperModel}
						</a>
						, a {WHISPER_MODELS[whisperModel].parameters} parameter speech recognition model and{' '}
						<a
							href="https://huggingface.co/Xenova/nllb-200-distilled-600M"
							target="_blank"
							rel="noreferrer"
							className="font-medium underline"
						>
							nllb-200-distilled
						</a>
						, a 600 million parameter language translation model, which are optimized for inference on the web. Once downloaded, the models
						(~1-2GB) will be cached and reused when you revisit the page.
						<br /><br />
						These two models run locally in your browser using{' '}
						<a
							href="https://huggingface.co/docs/transformers.js"
							target="_blank"
							rel="noreferrer"
							className="underline"
						>
							🤗&nbsp;Transformers.js
						</a>{' '}
						and ONNX Runtime Web, while the summarization feature requires sending your conversation log to Azure cloud service.
					</p>
					{/* Model selection dropdown and load button */}
					<div className="flex items-center gap-2 mb-4">
						<select
							value={whisperModel}
							onChange={(e) => setWhisperModel(e.target.value)}
							className="border rounded-lg p-2 max-w-[100px] bg-gray-100 dark:bg-white text-black dark:text-black"
						>
							<option value="tiny">Tiny</option>
							<option value="base">Base</option>
							<option value="small">Small</option>
							<option value="large-v3-turbo">Turbo</option>
						</select>
						<button
							className="border px-4 py-2 rounded-lg bg-blue-400 text-black dark:text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
							onClick={() => {
								if (useLocalTranscription) {
									setReady(true);
									WhisperWorker.current.postMessage({ type: 'load', data: { device: backend, modelIndex: Object.keys(WHISPER_MODELS).indexOf(whisperModel) } });
								}
								if (useLocalTranslation) {
								    // Do not remove this delay: it breaks webgpu if Translate finishes loading before Whisper
									// Need to be adjusted according to Whisper model size (tiny/base/small/large-v3-turbo)
									// Tested value for small: 5000ms
									setTimeout(() => {
										TranslateWorker.current.postMessage({ type: 'load' });
									}, 5000);
									setStatus('loading');
								}
								if (!useLocalTranscription && !useLocalTranslation) {
									setReady(true);
									setStatus('ready');
								}
							}}
						>
							Load model
						</button>
					</div>
					{/* Checkbox for translation mode */}
					<div className="flex items-center gap-2 mb-4">
						<div>
							<input
								type="checkbox"
								id="useLocalTranslation"
								checked={useLocalTranslation}
								onChange={(e) => setUseLocalTranslation(e.target.checked)}
								className="border rounded-lg p-2 bg-gray-100 dark:bg-white text-black dark:text-black"
							/>
							<label htmlFor="useLocalTranslation" className="text-md">
								Load translation model locally
							</label>
						</div>
						<div>
							<input
								type="checkbox"
								id="useLocalTranscription"
								checked={useLocalTranscription}
								onChange={(e) => setUseLocalTranscription(e.target.checked)}
								className="border rounded-lg p-2 bg-gray-100 dark:bg-white text-black dark:text-black"
							/>
							<label htmlFor="useLocalTranscription" className="text-md">
								Load transcription model locally
							</label>
						</div>
					</div>
					<SystemMonitor backend={backend} />
				</>
			)}
		</>
	);
};

export default WelcomeScreen;