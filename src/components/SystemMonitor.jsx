import React, { useState, useEffect, useRef } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/swiper-bundle.css";
import {
	InfoIcon, HardwareIcon, SoftwareIcon, RocketIcon, 
	NvidiaIcon, IntelIcon, AMDIcon, AppleIcon, QcomIcon, 
	WindowsIcon, AndroidIcon, LinuxIcon, ChromeIcon, 
	SafariIcon, FirefoxIcon, ChecklistIcon, DesktopIcon, 
	MobileIcon, BrowserIcon, NoteIcon, SpeedIcon, 
	OpenAIIcon, ThumbUpIcon 
} from "./Glyph";

const SystemMonitor = ({ backend, WhisperWorker, benchmarkScores, benchmarkRunning }) => {
	const [adapterInfo, setAdapterInfo] = useState(null);
	const [agentInfo, setAgentInfo] = useState(null);
	const [showInfoCard, setShowInfoCard] = useState(false);
	
	const infoSwiper = useRef(null);

	useEffect(() => {
		getAdapterInfo();
		getAgentInfo();
	}, []);
	
	useEffect(() => {
		// Initialize Swipers only when the Config Card is open
        if (showInfoCard && !infoSwiper.current) {
			setTimeout(() => {
				infoSwiper.current = initSwiper('info', 0);
			}, 0);
        } else if (!showInfoCard) {
			if (infoSwiper.current) {
				infoSwiper.current.destroy();
				infoSwiper.current = null;
			}
        }
    }, [showInfoCard]);

	const getAdapterInfo = async () => {
		const device = { name: '', type: '', vram: '', vendor: '' };
		if (!!navigator.gpu) {
			try {
				const adapter = await navigator.gpu.requestAdapter();
				if (adapter && adapter.info) {
					device.name = adapter.info.description || 'Unknown GPU';
					device.type = adapter.info.type || 'integrated GPU';
					device.vram = adapter.info.memoryHeaps ? `${Math.floor(adapter.info.memoryHeaps[0].size / 1024 / 1024)} MB VRAM` : 'System Memory';
					device.vendor = adapter.info.vendor || 'Unknown';
				} else {
					device.name = 'Unknown GPU';
					device.type = 'Unknown';
					device.vram = 'Unknown';
					device.vendor = 'Unknown';
				}
			} catch (error) {
				console.error('Error fetching GPU adapter:', error);
				device.name = 'Unknown GPU';
				device.type = 'Unknown';
				device.vram = 'Unknown';
				device.vendor = 'Unknown';
			}
		} else {
			if (!!navigator.hardwareConcurrency) {
				device.name = `${navigator.hardwareConcurrency} Cores CPU`;
			} else {
				device.name = 'Unknown';
			}
			device.type = 'CPU';
			device.vram = 'System Memory';
			device.vendor = 'Unknown';
		}
		setAdapterInfo(device);
	};

	const getAgentInfo = async () => {
		const userAgent = { os: '', browser: '', browserHeapSizeLimit: '', mic: '' };

		// Retrieve OS and browser info from navigator.userAgent
		if (!!navigator.userAgent) {
			const UAString = navigator.userAgent;

			// Detect OS and OS version
			let osName = '';
			let osVersion = '';

			if (UAString.includes('Android')) {
				osName = 'Android';
				const versionMatch = UAString.match(/Android (\d+)/);
				if (versionMatch) {
					osVersion = versionMatch[1];
				}
			} else if (UAString.includes('iPhone OS')) {
				osName = 'iOS';
				const versionMatch = UAString.match(/OS (\d+(_\d+)?)/);
				if (versionMatch) {
					osVersion = versionMatch[1].replace('_', '.');
				}
			} else if (UAString.includes('Windows')) {
				// Chromium-based browsers support client hints
				if (!!navigator.userAgentData?.platform) {
					try {
						const ua = await navigator.userAgentData.getHighEntropyValues(["platformVersion"]);
						if (navigator.userAgentData.platform === "Windows") {
							const majorPlatformVersion = parseInt(ua.platformVersion.split('.')[0]);
							if (majorPlatformVersion >= 13) {
								osName = "Windows 11";
							} else if (majorPlatformVersion > 0) {
								osName = "Windows 10";
							} else {
								if (UAString.includes('NT 6.3')) {
									osName = 'Windows 8.1';
								} else if (UAString.includes('NT 6.2')) {
									osName = 'Windows 8';
								} else if (UAString.includes('NT 6.1')) {
									osName = 'Windows 7';
								} else {
									osName = 'Windows';
								}
							}
						} else {
						  osName = 'Windows';
						}
					} catch (error) {
						console.error('Error retrieving platform version:', error);
						osName = 'Windows';
					}
				} else {
					osName = 'Windows';
				}
			} else if (UAString.includes('Mac OS')) {
				// Modern Mac OS typically just includes "Mac OS X"
				osName = 'Mac OS/iPad OS';
			} else if (UAString.includes('Linux')) {
				// Linux typically doesn't include a version in the userAgent string
				osName = 'Linux';
			} else {
				osName = 'Unknown OS';
				osVersion = 'Unknown';
			}

			// Combine OS name and version into a single string
			userAgent.os = `${osName} ${osVersion}`.trim();

			// Detect browser and version
			if (UAString.includes('Firefox')) {
				userAgent.browser = 'Firefox';
				const versionMatch = UAString.match(/Firefox\/(\d+)/);
				if (versionMatch) {
					userAgent.browser += ` v${versionMatch[1]}`;
				}
			} else if (UAString.includes('Edg')) {
				userAgent.browser = 'Microsoft Edge';
				const versionMatch = UAString.match(/Edg\/(\d+)/);
				if (versionMatch) {
					userAgent.browser += ` v${versionMatch[1]}`;
				}
			} else if (UAString.includes('Chrome')) {
				userAgent.browser = 'Chrome';
				const versionMatch = UAString.match(/Chrome\/(\d+)/);
				if (versionMatch) {
					userAgent.browser += ` v${versionMatch[1]}`;
				}
			} else if (UAString.includes('Safari')) {
				userAgent.browser = 'Safari';
				const versionMatch = UAString.match(/Version\/(\d+)/);
				if (versionMatch) {
					userAgent.browser += ` v${versionMatch[1]}`;
				}
			} else {
				userAgent.browser = 'Unknown Browser';
			}
		}

		// Retrieve microphone permission
		try {
			const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
			userAgent.mic = permissionStatus.state; // granted, denied, prompt
		} catch (error) {
			console.error('Error checking microphone permission:', error);
			userAgent.mic = 'Unknown';
		}
		
		if (!!performance.memory) {
			userAgent.browserHeapSizeLimit = `${Math.floor(performance.memory.jsHeapSizeLimit / 1024 / 1024)} MB RAM`;
		}

		setAgentInfo(userAgent);
	};
	
	const closeCardAnimation = (cardId) => {
		const card = document.getElementById(cardId);
		card.classList.add("motion-scale-out-0");
		card.classList.add("motion-duration-1000/scale");
		card.classList.add("motion-opacity-out-0");
		card.classList.add("motion-duration-125/opacity")
	}

	const handleClick = (type) => {
		if (type === 'info') {
			setShowInfoCard(true);
		}
	};

	const handleCancel = (type) => {
		if (type === 'info') {
			closeCardAnimation("InfoCard");
			setTimeout(() => {
				setShowInfoCard(false);
			}, 125)
		}
	};
	
	function initSwiper(swiperName, initialSlide) {
		return new Swiper(`.${swiperName}-container`, {
			modules: [Pagination],
			slidesPerView: 1,
			centeredSlides: true,
			spaceBetween: 25,
			initialSlide: initialSlide,
			pagination: {
				el: `.${swiperName}-pagination`,
				clickable: true,
			},

		});
	}
	
	async function decodeAudio(audioUrl) {
		const response = await fetch(audioUrl);
		const audioBlob = await response.blob();
		const arrayBuffer = await audioBlob.arrayBuffer();
		const audioContext = new AudioContext({ sampleRate: 16000 });
		const decoded = await audioContext.decodeAudioData(arrayBuffer);
		return decoded.getChannelData(0); // Return mono audio as Float32Array
	}

	return (
		<>
			{adapterInfo && (
				<>
					{/* Mini info box */}
					<span
						className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded cursor-pointer select-none"
						onClick={() => handleClick('info')}
					>
						Using: {adapterInfo.name || 'N/A'} ({backend})
					</span>
					{/* Pop-up prompt card for detailed system info */}
					{showInfoCard && agentInfo && (
						<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="InfoCard">
							<div className="bg-white dark:bg-gray-800 border-2 border-gray-700 p-6 rounded-lg shadow-lg max-w-sm relative">
								<div className="swiper info-container">
									<div className="swiper-wrapper" id="info-wrapper">
										<div className="swiper-slide info-slide">
											<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
												System Information
												<InfoIcon />
											</h2>
											<div>
												<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
													Hardware
													<HardwareIcon />
												</h3>
												<div>
													<ul className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
														<li className="flex items-center gap-1">
															Device Type: {adapterInfo.type || 'N/A'}
															{adapterInfo.type === 'discrete GPU' ? <ThumbUpIcon /> : ""}
														</li>
														<li className="flex items-center gap-1">
															Device Vendor: {adapterInfo.vendor || 'N/A'}
															{ adapterInfo.vendor === 'nvidia' ? <NvidiaIcon />
															: adapterInfo.vendor === 'intel' ? <IntelIcon />
															: adapterInfo.vendor === 'amd' ? <AMDIcon />
															: adapterInfo.vendor === 'apple' ? <AppleIcon />
															: adapterInfo.vendor === 'qualcomm' ? <QcomIcon />
															: '' }
														</li>
														<li>Device Name: {adapterInfo.name || 'N/A'}</li>
														<li>Device Memory: {adapterInfo.vram || 'N/A'}</li>
													</ul>
												</div>
											</div>
											<div>
												<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
													Software
													<SoftwareIcon />
												</h3>
												<div>
													<ul className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
														<li className="flex items-center gap-1">
															Backend: {backend}
															{backend === 'webgpu' ? <RocketIcon /> : ""}
														</li>
														<li className="flex items-center gap-1">
															Operating System: {agentInfo.os || 'N/A'}
															{ agentInfo.os.includes("Windows") ? <WindowsIcon />
															: agentInfo.os.includes("Android") ? <AndroidIcon />
															: agentInfo.os.includes("iOS") || agentInfo.os.includes("Mac OS") || agentInfo.os.includes("iPadOS") ? <AppleIcon />
															: agentInfo.os.includes("Linux") ? <LinuxIcon />
															: ''}
														</li>
														<li className="flex items-center gap-1">
															Browser: {agentInfo.browser || 'N/A'}
															{ agentInfo.browser.includes("Chrome") || agentInfo.browser.includes("Chromium") || agentInfo.browser.includes("Edge") ? <ChromeIcon />
															: agentInfo.browser.includes("Safari") ? <SafariIcon />
															: agentInfo.browser.includes("Firefox") ? <FirefoxIcon />
															: ''}
														</li>
														<li>Worker Memory: {agentInfo.browserHeapSizeLimit || 'N/A'}</li>
														<li>Microphone Permission: {agentInfo.mic || 'N/A'}</li>
													</ul>
												</div>
											</div>
										</div>
										<div className="swiper-slide info-slide">
											<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
												Minimum Requirements
												<ChecklistIcon />
											</h2>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Desktop
												<DesktopIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>
														CPU:{' '}
														<a
															href="https://browser.geekbench.com/processor-benchmarks"
															target="_blank"
															rel="noreferrer"
															className="underline"
														>
															Intel{"\u{AE}"} Core{"\u{2122}"} i5-12500
														</a>
														{' '}or equivalent</li>
													<li>RAM: 16GB DDR5 memory</li>
												</ul>
											</div>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Mobile
												<MobileIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>
														SOC:{' '}
														<a
															href="https://en.wikipedia.org/wiki/List_of_devices_using_Qualcomm_Snapdragon_systems_on_chips#Snapdragon_8/8+_Gen_1_(2022)"
															target="_blank"
															rel="noreferrer"
															className="underline"
														>
															Qualcomm{"\u{AE}"} S8+ Gen1
														</a>
														{' '}or equivalent
													</li>
													<li>RAM: 8GB LPDDR5 unified memory</li>
												</ul>
											</div>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Supported Browsers
												<BrowserIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>Chromium-based: stable v133 or above</li>
													<li>Gecko-based: nightly v126 or above</li>
												</ul>
											</div>
										</div>
										<div className="swiper-slide info-slide">
											<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
												Recommended Requirements
												<ChecklistIcon />
											</h2>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Desktop
												<DesktopIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>GPU:{' '}
													<a
														href="https://www.techpowerup.com/gpu-specs/geforce-rtx-2060.c3310"
														target="_blank"
														rel="noreferrer"
														className="underline"
													>
														NVIDIA RTX 2060
													</a>
													{' '}or equivalent</li>
													<li>VRAM: 6GB GDDR6 video memory</li>
												</ul>
											</div>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Mobile
												<MobileIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>
														SOC:{' '}
														<a
															href="https://en.wikipedia.org/wiki/Apple_M2#Products_that_use_the_Apple_M2_series"
															target="_blank"
															rel="noreferrer"
															className="underline"
														>
															Apple M2
														</a>
														{' '}or equivalent
													</li>
													<li>RAM: 16GB LPDDR5 unified memory</li>
												</ul>
											</div>
											<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
												Note
												<NoteIcon />
											</h3>
											<div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
												<ul>
													<li>MacOS/iOS Safari browser is currently unsupported in WebGPU mode</li>
												</ul>
											</div>
										</div>
										<div className="swiper-slide info-slide">
											<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
												Benchmark
												<SpeedIcon />
											</h2>
											<div className="mb-4">
												<p>You can test your hardware capability here to better decide which model to load locally.<br />A model should be able to run smoothly in real-time when you reach a score of{" >"}=100.</p>
											</div>
											<div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-4 relative">
												{/* Top Left: Tiny */}
												<div
													className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-center shadow-sm cursor-pointer select-none"
													onClick={async () => {
														if (!benchmarkRunning) {
															const audioData = await decodeAudio("./sample.m4a");
															WhisperWorker.current.postMessage({ type: 'benchmark', data: { device: backend, modelIndex: 0, audio: audioData } });
														}
													}}
													disabled={benchmarkRunning}
												>
													<h3 className="font-semibold text-base">Whisper Tiny</h3>
													<div className="relative inline-block">
														<p className="text-lg font-bold">{benchmarkScores[0].toFixed(0)}</p>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{benchmarkScores[0] >= 150 ? 'Excellent \u{25CE}' : benchmarkScores[0] >= 100 ? 'Good \u{25CB}' : benchmarkScores[0] >= 50 ? 'Mediocre \u{25B3}' : benchmarkScores[0] == 0 ? 'Run benchmark' : 'Poor \u{D7}'}
													</p>
												</div>
												{/* Top Right: Base */}
												<div
													className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-center shadow-sm cursor-pointer select-none"
													onClick={async () => {
														if (!benchmarkRunning) {
															const audioData = await decodeAudio("./sample.m4a");
															WhisperWorker.current.postMessage({ type: 'benchmark', data: { device: backend, modelIndex: 1, audio: audioData } });
														}
													}}
													disabled={benchmarkRunning}
												>
													<h3 className="font-semibold text-base">Whisper Base</h3>
													<div className="relative inline-block">
														<p className="text-lg font-bold">{benchmarkScores[1].toFixed(0)}</p>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{benchmarkScores[1] >= 150 ? 'Excellent \u{25CE}' : benchmarkScores[1] >= 100 ? 'Good \u{25CB}' : benchmarkScores[1] >= 50 ? 'Mediocre \u{25B3}' : benchmarkScores[1] == 0 ? 'Run benchmark' : 'Poor \u{D7}'}
													</p>
												</div>
												{/* Bottom Left: Small */}
												<div
													className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-center shadow-sm cursor-pointer select-none"
													onClick={async () => {
														if (!benchmarkRunning) {
															const audioData = await decodeAudio("./sample.m4a");
															WhisperWorker.current.postMessage({ type: 'benchmark', data: { device: backend, modelIndex: 2, audio: audioData } });
														}
													}}
													disabled={benchmarkRunning}
												>
													<h3 className="font-semibold text-base">Whisper Small</h3>
													<div className="relative inline-block">
														<p className="text-lg font-bold">{benchmarkScores[2].toFixed(0)}</p>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{benchmarkScores[2] >= 150 ? 'Excellent \u{25CE}' : benchmarkScores[2] >= 100 ? 'Good \u{25CB}' : benchmarkScores[2] >= 50 ? 'Mediocre \u{25B3}' : benchmarkScores[2] == 0 ? 'Run benchmark' : 'Poor \u{D7}'}
													</p>
												</div>
												{/* Bottom Right: Turbo */}
												<div
													className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-center shadow-sm cursor-pointer select-none"
													onClick={async () => {
														if (!benchmarkRunning) {
															const audioData = await decodeAudio("./sample.m4a");
															WhisperWorker.current.postMessage({ type: 'benchmark', data: { device: backend, modelIndex: 3, audio: audioData } });
														}
													}}
													disabled={benchmarkRunning}
												>
													<h3 className="font-semibold text-base">Whisper Turbo</h3>
													<div className="relative inline-block">
														<p className="text-lg font-bold">{benchmarkScores[3].toFixed(0)}</p>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{benchmarkScores[3] >= 150 ? 'Excellent \u{25CE}' : benchmarkScores[3] >= 100 ? 'Good \u{25CB}' : benchmarkScores[3] >= 50 ? 'Mediocre \u{25B3}' : benchmarkScores[3] == 0 ? 'Run benchmark' : 'Poor \u{D7}'}
													</p>
												</div>
												{/* Overlay Icon in the Center */}
												<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
													<div className={`${benchmarkRunning ? 'motion-preset-spin' : ''}`}>
														<OpenAIIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
													</div>
												</div>
											</div>
											<div className="flex flex-col items-center gap-2 mb-4">
												<button
													className="border px-4 py-2 rounded-lg bg-blue-400 text-black dark:text-white hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed select-none"
													onClick={async () => {
														const audioData = await decodeAudio("./sample.m4a");
														WhisperWorker.current.postMessage({ type: 'benchmark', data: { device: backend, modelIndex: -1, audio: audioData } });	
													}}
													disabled={benchmarkRunning}
												>
													Run all benchmarks
												</button>
											</div>
										</div>
									</div>
								</div>
								<div className="swiper-pagination info-pagination motion-opacity-in-[0%]"></div>
								<button
									className="absolute top-2 right-2 px-2 text-sm bg-white dark:bg-gray-800 rounded"
									onClick={() => handleCancel('info')}
								>
									⨯
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
};

export default SystemMonitor;