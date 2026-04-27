import React, { useState, useEffect } from "react";
import Swiper from "swiper";
import { Navigation, Autoplay } from "swiper/modules"; // Import Navigation module
import "swiper/swiper-bundle.css";
import SystemMonitor from "./SystemMonitor";
import ModelSelector from "./ModelSelector";

const WelcomeScreen = (
	{
		status, setStatus, setReady, backend, WhisperWorker, TranslateWorker,
		useLocalTranscription, setUseLocalTranscription, useLocalTranslation, setUseLocalTranslation,
		benchmarkScores, benchmarkRunning,
		endpoints, setEndpoints, keys, setKeys
	}) => {
    const [whisperIndex, setWhisperIndex] = useState(0); // Default whisper-tiny or previous saved state
    const [swiperInitialized, setSwiperInitialized] = useState(false); // Arrow-swiper for Q&A card

    useEffect(() => {
        if (!swiperInitialized) {
            const swiper = new Swiper('.qa-swiper-container', {
                modules: [Navigation, Autoplay],
                slidesPerView: 1,
				initialSlide: 0,
				spaceBetween: 25,
                centeredSlides: true,
                autoplay: {
                    delay: 10000, // Autoplay every 5 seconds
                    disableOnInteraction: true, // Pause autoplay even after user interaction
                },
                navigation: {
                    nextEl: '.qa-swiper-button-next', // Next button selector
                    prevEl: '.qa-swiper-button-prev', // Previous button selector
                },
            });
            setSwiperInitialized(true);
        }
    }, [swiperInitialized]);

    return (
        <>
            {status === null && (
                <>
                    {/* Q&A Swiper */}
                    <div className="mt-4 mb-4 relative md:max-w-[480px] max-w-[320px]">
                        <div className="flex items-center gap-4">
                            {/* Previous Button */}
                            <div className="qa-swiper-button-prev cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </div>
                            {/* Swiper Container */}
                            <div className="swiper qa-swiper-container flex-grow">
                                <div className="swiper-wrapper">
                                    {/* Slide 1 */}
                                    <div className="swiper-slide">
                                        <p>
                                            <span className="underline font-medium">What is this?</span>
                                            <br />
                                            This is an in-browser all-in-one note-taking assistant🤖 powered by state-of-the-art🦾 language models, made possible by{' '}
                                            <a
                                                href="https://huggingface.co/docs/transformers.js"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline"
                                            >
                                                🤗&nbsp;Transformers.js 
                                            </a>
                                            {' '}and{' '}
                                            <a
                                                href="https://onnxruntime.ai/docs/"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline"
                                            >
                                                ONNX Runtime
                                            </a>
											.
                                        </p>
                                    </div>
                                    {/* Slide 2 */}
                                    <div className="swiper-slide">
                                        <p className="text-sm">
                                            <span className="underline font-medium">How does this work?</span>
                                            <br />
                                            Speech is captured from your device's microphone🎙 and sent to a Transcription Model for real-time automated speech recognition💬. The transcript is then sent to a Translation Model for multi-lingual translation🔤. The translated log is finally sent to a Summarization Model for formatted note generation📃.
                                        </p>
                                    </div>
                                    {/* Slide 3 */}
                                    <div className="swiper-slide">
                                        <p>
                                            <span className="underline font-medium">Where does the data go?</span>
                                            <br />
                                            For each model, you can either run it locally🏠 in your browser for better privacy🔐 or use cloud computing service🌐 for more reliable performance🚀, depending on your hardware and preference.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/* Next Button */}
                            <div className="qa-swiper-button-next cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    {/* Model selection dropdown and load button (To be replaced by Configuration card `ModelSelector.jsx`)*/}
                    <div className="flex items-center gap-2 mb-4">
						<ModelSelector
							setUseLocalTranscription={setUseLocalTranscription}
							setUseLocalTranslation={setUseLocalTranslation}
							setWhisperIndex={setWhisperIndex}
							endpoints={endpoints}
							setEndpoints={setEndpoints}
							keys={keys}
							setKeys={setKeys}
						/>
                        <button
                            className="border px-4 py-2 rounded-lg bg-blue-400 text-black dark:text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
                            onClick={async () => {
								//console.log(useLocalTranscription, useLocalTranslation);
								//console.log(whisperIndex);
								if (useLocalTranscription) {
									//setReady(true); // Don't use it, leads to duplicated progress bars (investigating)
									WhisperWorker.current.postMessage({ type: 'load', data: { device: backend, modelIndex: whisperIndex } });
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

								if (!useLocalTranscription) {
									setReady(true);
									setStatus('ready');
								}
                            }}
                        >
                            Load model
                        </button>
                    </div>
                    <SystemMonitor
						backend={backend}
						WhisperWorker={WhisperWorker}
						benchmarkScores={benchmarkScores}
						benchmarkRunning={benchmarkRunning}
					/>
                </>
            )}
        </>
    );
};

export default WelcomeScreen;