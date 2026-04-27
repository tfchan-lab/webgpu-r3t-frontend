// Library imports
import { useEffect, useRef, useState } from 'react';

// Component imports
import ThemeToggle from "./components/ThemeToggle";
import WelcomeScreen from "./components/WelcomeScreen";
import { AudioVisualizer } from './components/AudioVisualizer';
import Progress from './components/Progress';
import LanguageBox from "./components/LanguageBox";
import SummaryBox from "./components/SummaryBox";

// Style imports
import './App.css';

// Constant definitions
const IS_WEBGPU_AVAILABLE = !!navigator.gpu;
const WHISPER_SAMPLING_RATE = 16000; // Sampling rate for Whisper (Do not change!)
const MAX_AUDIO_LENGTH = 30; // Maximum audio length in seconds (Do not increase to >30 at the moment, requires some hacks to make it work properly and not overwhelm the hardware capability)
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH; // Maximum number of audio samples per chunk
const DB_THRESHOLD = 30; // Minimum volume to feed audio chunk (Whisper near the mic: 30dB, Conversation near the mic: 50dB)
const DB_OFFSET = 65; // Default offset value for microphone sensitivity (Tested values: 3.5mm jack stereo microphone = +65, Smartphone microphone = +85)

function App() {
	// Load theme state from local storage, hook is set here to stay consistent even when ThemeToggle component is unloaded
	const [isDarkMode, setIsDarkMode] = useState(() => {
		const savedTheme = localStorage.getItem("theme");
		return savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
	});
	const [backend, setBackend] = useState(IS_WEBGPU_AVAILABLE ? 'webgpu' : 'wasm'); // Default to WebGPU if available with user's browser, otherwise WASM
	
	// Workers & tool references
    const WhisperWorker = useRef(null); // Reference to Whisper's worker
	const TranslateWorker = useRef(null); // Reference to Translate's worker
    const recorderRef = useRef(null); // Reference to the MediaRecorder
    const audioContextRef = useRef(null); // Reference to the AudioContext

    // Model loading and progress
    const [status, setStatus] = useState(null);
	const [ready, setReady] = useState(null); // TODO: Check if this is still in-use or just deprecated (other than in experimental)
    const [loadingMessage, setLoadingMessage] = useState('');
    const [progressItems, setProgressItems] = useState([]);

    // Inputs and outputs
    const [text, setText] = useState(''); // Whisper output
	const [tps, setTps] = useState(null); // Token per second speed counter for Whisper
    const [input, setInput] = useState(''); // Translate input (from Whisper outputs, Experimental: LocalAgreement-N, N=2 confirmed outputs)
	const inputRef = useRef(input);
    const [language, setLanguage] = useState('en'); // Default language for Whisper set to English
	const languageRef = useRef(language);
    const [targetLanguage, setTargetLanguage] = useState('zho_Hant'); // Default language for translation set to Traditional Chinese
	const targetLanguageRef = useRef(targetLanguage);
	const [output, setOutput] = useState(''); // Translation output

    // Audio recording and processing
    const [recording, setRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chunks, setChunks] = useState([]); // Audio chunks from MediaRecorder
    const [stream, setStream] = useState(null); // Audio stream from microphone
	const [decibel, setDecibel] = useState(null); // Audio chunk volume level
	const [dbOffset, setDbOffset] = useState(DB_OFFSET); // Adjustable microphone sensitivity
	
	// Past sentences log
	const [pastOutputs, setPastOutputs] = useState([]);
	const pastOutputsRef = useRef(pastOutputs);
	
	// Model inference mode
	const [useLocalTranscription, setUseLocalTranscription] = useState(false); // Default to local transcription
	const [useLocalTranslation, setUseLocalTranslation] = useState(false); // Default to server translation for now, as webgpu q8 is broken
	const [isTranslating, setIsTranslating] = useState(false); // Lock to prevent server-mode POSTing the same message multiple times
	
	// Benchmark
	const [benchmarkScores, setBenchmarkScores] = useState([0, 0, 0, 0]);
	const [benchmarkRunning, setBenchmarkRunning] = useState(false);
	
    // Setup workers and event listeners
    useEffect(() => {
        if (!WhisperWorker.current) {
			// Create Whisper's worker if it does not exist yet
            WhisperWorker.current = new Worker(new URL('./WhisperWorker.js', import.meta.url), { type: 'module' });
			console.log(`[App] [${getTimestamp()}] Whisper Worker set up.`);
        }
		
		if (useLocalTranslation && !TranslateWorker.current) {
			// Create Translate's worker if it does not exist yet
            TranslateWorker.current = new Worker(new URL('./TranslateWorker.js', import.meta.url), { type: 'module' });
			console.log(`[App] [${getTimestamp()}] Translate Worker set up.`);
        }
		
		// Create a callback function for message from the two worker threads
        const onMessageReceived = (e) => {
			mainThreadHandler(e);
		};
		
		// Attach callback functions as event listeners
        WhisperWorker.current.addEventListener('message', onMessageReceived);
		if (useLocalTranslation) TranslateWorker.current.addEventListener('message', onMessageReceived);
		
		// Clean-up function when Whisper/Translate is unmounted
        return () => {
            WhisperWorker.current.removeEventListener('message', onMessageReceived);
			if (useLocalTranslation) TranslateWorker.current.removeEventListener('message', onMessageReceived);
        };
	});

    // Setup MediaRecorder and microphone stream
    useEffect(() => {
        if (recorderRef.current) return;

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                    setStream(stream);

                    recorderRef.current = new MediaRecorder(stream);
                    audioContextRef.current = new AudioContext({
                        sampleRate: WHISPER_SAMPLING_RATE,
                    });

                    recorderRef.current.onstart = () => {
                        setRecording(true);
                        setChunks([]);
                    };

                    recorderRef.current.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            setChunks((prev) => [...prev, e.data]);
                        } else {
                            // Empty chunk received, request new data after a short timeout
                            setTimeout(() => {
                                recorderRef.current.requestData();
                            }, 25);
                        }
                    };

                    recorderRef.current.onstop = () => {
                        setRecording(false);
                    };
                })
                .catch((err) => console.error('[App] Error accessing microphone:', err));
        } else {
            console.error('[App] getUserMedia not supported on your browser!');
        }

        return () => {
            recorderRef.current?.stop();
            recorderRef.current = null;
        };
    }, []);

	// Process audio chunks when MediaRecorder is ready
	useEffect(() => {
		if (!recorderRef.current) return;
		if (!recording) return;
		if (isProcessing) return;
		if (status !== 'ready') return;

		if (chunks.length > 0) {
			const blob = new Blob(chunks, { type: recorderRef.current.mimeType });
			const fileReader = new FileReader();

			fileReader.onloadend = async () => {
				const arrayBuffer = fileReader.result;
				const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
				let audio = decoded.getChannelData(0);

				if (audio.length > MAX_SAMPLES) {
					// Trim audio to the last MAX_SAMPLES
					audio = audio.slice(-MAX_SAMPLES);
				}

				// Calculate the dB level of the audio chunk
				setDecibel(calculateDB(audio));

				// Only send the chunk to the worker if the volume exceeds the threshold (May need to revise to work with LA-2)
				if (decibel !== null && decibel >= DB_THRESHOLD) {
					WhisperWorker.current.postMessage({
						type: 'generate',
						data: { audio, language },
						//onLocal: useLocalTranscription
					});
				} else {
					await new Promise(r => setTimeout(r, 1000));
					return recorderRef.current?.requestData(); // Recursively run until fulfill threshold
				}
			};
			fileReader.readAsArrayBuffer(blob);
		} else {
			recorderRef.current?.requestData();
		}
	}, [status, recording, isProcessing, chunks, language]);
	
	// These hooks can be deprecated soon
	useEffect(() => {
		if (inputRef.current === text) return; // Last sentence = Current sentence
		
		setInput(text);
		inputRef.current = text;
		
		if (status === 'ready') { // Prevent initial load and reload error due to translation requests before model fully loaded (This is probably fixed and no longer needed)
			translate();
		}
	}, [text]);
	
	useEffect(() => {
		languageRef.current = language;
	}, [language]);

	useEffect(() => {
		targetLanguageRef.current = targetLanguage;
	}, [targetLanguage]);
	// Here

	// Main control logic that handles statuses/results from Workers/Servers
	const mainThreadHandler = (e) => {
		switch (e.data.status) {
			// Download/Cache retrieval
			case 'download':
				console.log(`[App] [${getTimestamp()}] Downloading model from huggingface / Retrieving model from cache`);
				break;
			// Load to RAM/VRAM
			case 'loading':
				setStatus('loading');
				setLoadingMessage(e.data.data);
				break;
			// Worker initiation
			case 'initiate':
				setProgressItems((prev) => [...prev, { ...e.data, workerType: e.data.workerType }]);
				break;
			// Progress bar update
			case 'progress':
				setProgressItems((prev) =>
					prev.map((item) =>
						item.file === e.data.file && item.workerType === e.data.workerType
							? { ...item, ...e.data }
							: item
					)
				);
				break;
			// Finished loading model file, remove progress bar of the file
			case 'done':
				setProgressItems((prev) =>
					prev.filter(
						(item) =>
							!(item.file === e.data.file && item.workerType === e.data.workerType)
					)
				);
				break;
			// Pipeline ready to accept messages
			case 'ready':
				if (useLocalTranslation) {
					if (e.data.workerType === 'translation') {
						setStatus('ready');
					}
				} else {
					setStatus('ready');
				}
				try {
					recorderRef.current?.start();
				} catch (InvalidStateError) {
					console.log(`[App] [${getTimestamp()}] Started MediaRecorder.`)
				}
				break;
			// Update the token per second counter
			case 'update':
				{
					const { tps } = e.data;
					setTps(tps);
				}
				break;
			// Whisper starts listening for inputs
			case 'whisper_start':
				setIsProcessing(true);
				recorderRef.current?.requestData();
				break;
			// Whisper finishes processing current inputs
			case 'whisper_complete':
				setIsProcessing(false);
				setText(e.data.output[0]);
				if (e.data.output[0] && TranslateWorker.current) {
					TranslateWorker.current.postMessage({
						type: 'translate',
						data: { text: e.data.output[0], src_lang: language, tgt_lang: targetLanguage }
					});
				} else if (e.data.output[0] && !useLocalTranslation) {
					translate(e.data.output[0]);
				}
				break;
			// Translate finishes processing current inputs
			case 'translate_complete':
				setOutput(e.data.output)
				
				if (
					e.data.output.trim()
				) {
					const lastSentence = (pastOutputsRef.current.length > 0) ? pastOutputsRef.current[pastOutputsRef.current.length - 1] : null;
					// Experimental Conditions:
					// 1. The past output buffer is empty
					// OR
					// 2. This sentence is NOT a substring of the last sentence
					if ((
						!lastSentence || !(lastSentence.sentence.includes(e.data.output))
					)) {
						setPastOutputs((prev) => {
							const updatedOutputs = [
								// Replace if this sentence is a superstring of the last sentence
								...(lastSentence && e.data.output.includes(lastSentence.sentence) ? prev.slice(0, -1) : prev),
								{
									timestamp: new Date().toLocaleTimeString(),
									sentence: e.data.output,
								},
							];
							pastOutputsRef.current = updatedOutputs; // Update the ref
							return updatedOutputs;
						});
					}
				}
				break;
			case 'benchmark_start':
				setBenchmarkRunning(true);
				break;
			case 'benchmark_update':
				setBenchmarkScores(e.data.data.scores);
				break;
			case 'benchmark_complete':
				setBenchmarkRunning(false);
				break;
			// Show error message in console
			case 'error':
				console.warn(e.data.data);
				break;
			// Exception
			default:
				console.warn('[App] Unknown status:', e.data.status);
				break;
		}
	};
	
	// Translate control logic that routes between local worker and server
	const translate = async () => {
		if (isTranslating) return;
		
		if (languageRef.current === targetLanguageRef.current) {
			setOutput(inputRef.current);
			return;
		}
		
		setIsTranslating(true); // Obtain lock
				
		if (useLocalTranslation) {
			console.log(`[App] [${getTimestamp()}] Sending translation request to Translate Worker... (${languageRef.current} -> ${targetLanguageRef.current})`);
			TranslateWorker.current.postMessage({
				type: 'translate',
				data: {
					text: inputRef.current,
					src_lang: languageRef.current,
					tgt_lang: targetLanguageRef.current,
				},
			});
		} else {
			console.log(`[App] [${getTimestamp()}] Sending translation request to server... (${languageRef.current} -> ${targetLanguageRef.current})`);
			try {
				const endpoint = import.meta.env.VITE_TRANSLATE_API_ENDPOINT;
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						text,
						src_lang: languageRef.current,
						tgt_lang: targetLanguageRef.current,
					}),
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				if (data.error) {
					throw new Error(data.error);
				}

				setOutput(data.translated_text);

				if (
					data.translated_text.trim() &&
					(pastOutputsRef.current.length === 0 || data.translated_text !== pastOutputsRef.current[pastOutputsRef.current.length - 1].sentence)
				) {
					setPastOutputs((prev) => {
						const updatedOutputs = [
							...prev,
							{
								timestamp: new Date().toLocaleTimeString(),
								sentence: data.translated_text,
							},
						];
					pastOutputsRef.current = updatedOutputs;
					return updatedOutputs;
					});
				}
			} catch (error) {
				console.warn('Error during translation:', error);
			}
		}
		
		setIsTranslating(false); // Release lock
	};
	
	const reloadModel = async () => {
		// Terminate the existing worker(s) to unload the model(s)
		// Note: Usually only the translate model goes OOM, therefore I only reload TranslateWorker here.
		if (useLocalTranslation && TranslateWorker.current) {
			TranslateWorker.current.terminate();
			TranslateWorker.current = null;
		} else {
			return
		}

		// Reset the state to reflect the unloading
		setStatus(null);
		setReady(null);
		setOutput('');

		// Reinitialize the workers to reload the models
		TranslateWorker.current = new Worker(new URL('./TranslateWorker.js', import.meta.url), { type: 'module' });
		// Load the models again
		TranslateWorker.current.postMessage({ type: 'load' });
	};
	
	// Function to calculate RMS and dB for volume thresholding (TODO: choose a better sampling windows to increase the accuracy)
	// Useful formulas: https://helpfiles.keysight.com/csg/89600B/Webhelp/Subsystems/gettingstarted/content/concepts_decibels.htm
	function calculateRMS(audioData) {
		let sum = 0;
		let length = audioData.length;
		let window = 4;
		let start = length > WHISPER_SAMPLING_RATE * window ? length - WHISPER_SAMPLING_RATE * window : 0; // Sampling windows = 4 seconds
		for (let i = start; i < audioData.length; i++) {
			sum += audioData[i] * audioData[i];
		}
		const rms = Math.sqrt(sum / audioData.length);
		return rms;
	}

	function calculateDB(audioData) {
		const rms = calculateRMS(audioData);
		// Avoid log(0) which is -Infinity
		if (rms === 0) return -Infinity;
		return 20 * Math.log10(rms) + dbOffset;
	}
	
	// TODO: Move this to utils in the future if used by multiple components
	function getTimestamp() {
		return new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/,/g, '').replace(/ /g, '/').replace(/(\d{2})\/(\w{3})\/(\d{4})\/(\d{2}):(\d{2}):(\d{2})/, '$1/$2/$3 $4:$5:$6');
	}
	
    return (
		<div className="flex flex-col h-screen mx-auto justify-end text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 transition-colors duration-500">
			{
				<div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
					{/* Theme toggle button (Appear on main/loading screen, disappear when ready) */}
					{status !== 'ready' && (<ThemeToggle isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />)}
					
					{/* App Title (Will always appear on-screen) */}
					<div className="flex flex-col items-center mb-1 max-w-[90%] md:max-w-[500px] text-center">
						<h1 className="text-4xl font-bold mb-1">WebGPU NoteTaker</h1>
						<h2 className="text-xl font-semibold">Real-time all-in-one assistant for</h2>
						<h3 className="text-sm font-semibold italic">
							Speech Recognition, Translation and Summarization
						</h3>
					</div>
					
					{/* App Content */}
					<div className="flex flex-col items-center px-4 w-[90%] md:w-[500px]">
						{/* Main Content */}
						<div className="w-full md:w-[500px] p-2">
							{/* Audio visualizer (Also always on-screen) */}
							<AudioVisualizer
								className="w-full rounded-lg"
								stream={stream}
								decibel={decibel}
								dbOffset={dbOffset}
								setDbOffset={setDbOffset}
							/>
							{/* Model output display boxes */}
							<LanguageBox
								status={status}
								text={text}
								output={output}
								language={language}
								targetLanguage={targetLanguage}
								tps={tps}
								setLanguage={setLanguage}
								setTargetLanguage={setTargetLanguage}
							/>
							{/* Result display boxes */}
							<SummaryBox
								status={status}
								pastOutputs={pastOutputs}
								setPastOutputs={setPastOutputs}
								reloadModel={reloadModel}
							/>
						</div>
						
						{/* Welcome Screen (before loading the models) */}
						<WelcomeScreen
							status={status}
							setStatus={setStatus}
							backend={backend}
							WhisperWorker={WhisperWorker}
							TranslateWorker={TranslateWorker}
							useLocalTranscription={useLocalTranscription}
							setUseLocalTranscription={setUseLocalTranscription}
							useLocalTranslation={useLocalTranslation}
							setUseLocalTranslation={setUseLocalTranslation}
							benchmarkScores={benchmarkScores}
							benchmarkRunning={benchmarkRunning}
						/>
						
						{/* Progress bars */}
						{status === 'loading' && (
							<div className="w-full max-w-[500px] text-left mx-auto p-4">
								<p className="text-center">{loadingMessage}</p>
								{progressItems.map(({ file, progress, total }, i) => (
									<Progress
										key={i}
										text={file}
										percentage={progress}
										total={total}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			}
		</div>
	);
}

export default App;