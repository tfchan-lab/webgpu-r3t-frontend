import React, { useState, useEffect, useRef } from "react";
import Swiper from "swiper";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";
import { OpenAIIcon, MetaIcon, DeepLIcon, TranscriptIcon, TranslateIcon, SummaryIcon, SoftwareIcon, EditIcon, FilterIcon, OnlineIcon, OfflineIcon, PhoneIcon, LaptopIcon, Desktop2Icon } from "./Glyph";

// Constant definitions
// Which index online models start from
const TRANSCRIPT_SLICE_INDEX = 4;
const TRANSLATE_SLICE_INDEX = 3;
const SUMMARY_SLICE_INDEX = 3;

const ModelSelector = (
	{
		setUseLocalTranscription, setUseLocalTranslation, setWhisperIndex,
		endpoints, setEndpoints, keys, setKeys
	}) => {
    const [showConfigCard, setShowConfigCard] = useState(false);
    
	const configSwiper = useRef(null);
    const transcriptSwiper = useRef(null);
    const translateSwiper = useRef(null);
    const summarySwiper = useRef(null);
    
	const [transcriptIndex, setTranscriptIndex] = useState(0);
    const [translateIndex, setTranslateIndex] = useState(0);
    const [summaryIndex, setSummaryIndex] = useState(0);
    
	const [localTranscript, setLocalTranscript] = useState(true);
    const [localTranslate, setLocalTranslate] = useState(true);
    const [localSummary, setLocalSummary] = useState(true);

    // Load state from local storage on component mount
    useEffect(() => {
        const savedTranscriptIndex = localStorage.getItem("transcriptIndex");
        const savedTranslateIndex = localStorage.getItem("translateIndex");
        const savedSummaryIndex = localStorage.getItem("summaryIndex");
        const savedLocalTranscript = localStorage.getItem("localTranscript");
        const savedLocalTranslate = localStorage.getItem("localTranslate");
        const savedLocalSummary = localStorage.getItem("localSummary");
		const savedTranscriptEndpoint = localStorage.getItem("transcriptEndpoint"); // Save endpoints only, DO NOT save API Keys
		const savedTranslateEndpoint = localStorage.getItem("translateEndpoint"); // Save endpoints only, DO NOT save API Keys
		const savedSummaryEndpoint = localStorage.getItem("summaryEndpoint"); // Save endpoints only, DO NOT save API Keys (Very important, need to repeat thrice)

		// Local storage states are strings
        if (savedTranscriptIndex !== null) {
            setTranscriptIndex(Number(savedTranscriptIndex));
            setWhisperIndex(Number(savedTranscriptIndex));
        }
        if (savedTranslateIndex !== null) setTranslateIndex(Number(savedTranslateIndex));
        if (savedSummaryIndex !== null) setSummaryIndex(Number(savedSummaryIndex));
        if (savedLocalTranscript !== null) {
            setLocalTranscript(savedLocalTranscript === "true");
            setUseLocalTranscription(savedLocalTranscript === "true");
        }
        if (savedLocalTranslate !== null) {
            setLocalTranslate(savedLocalTranslate === "true");
            setUseLocalTranslation(savedLocalTranslate === "true");
			//setUseLocalSummarization(savedLocalSummary === "true");
        }
        if (savedLocalSummary !== null) {
            setLocalSummary(savedLocalSummary === "true");
        }
		if (savedTranscriptEndpoint !== null) {
			updateEndpoint(0, savedTranscriptEndpoint);
		}
		if (savedTranslateEndpoint !== null) {
			updateEndpoint(1, savedTranslateEndpoint);
		}
		if (savedSummaryEndpoint !== null) {
			updateEndpoint(2, savedSummaryEndpoint);
		}
		//console.log("[App] [Debug] Restored states from previous session:", savedLocalTranscript === "true", savedLocalTranslate === "true", savedLocalSummary === "true");
    }, []);

    useEffect(() => {
		// Initialize Swipers only when the Config Card is open
        if (showConfigCard && !configSwiper.current) {
            configSwiper.current = new Swiper('.config-container', {
				allowTouchMove: false,
				spaceBetween: 25,
                modules: [Pagination],
                pagination: {
					el: '.config-pagination',
					clickable: true,
					renderBullet: function (index, className) {
						return '<span class="' + className + '">' + (index + 1) + '</span>';
					},
				},
            });

            transcriptSwiper.current = initSwiper('transcript', transcriptIndex);
            translateSwiper.current = initSwiper('translate', translateIndex);
            summarySwiper.current = initSwiper('summary', summaryIndex);
            setTimeout(() => {
                toggleSlides("transcript", TRANSCRIPT_SLICE_INDEX, !localTranscript);
                toggleSlides("translate", TRANSLATE_SLICE_INDEX, !localTranslate);
                toggleSlides("summary", SUMMARY_SLICE_INDEX, !localSummary);
            }, 100);
            initBorder();
        } else if (!showConfigCard && configSwiper.current) {
            //console.log("[App] [Debug] Current states:", localTranscript, localTranslate, localSummary);
			if (transcriptSwiper.current) {
                let dynamicIndex = !localTranscript && transcriptSwiper.current.activeIndex === TRANSCRIPT_SLICE_INDEX ? 0 : transcriptSwiper.current.activeIndex;
                setTranscriptIndex(dynamicIndex);
                setWhisperIndex(dynamicIndex);
                setUseLocalTranscription(localTranscript);
                localStorage.setItem("transcriptIndex", dynamicIndex);
                transcriptSwiper.current.destroy();
                transcriptSwiper.current = null;
            }
            if (translateSwiper.current) {
                let dynamicIndex = !localTranslate && translateSwiper.current.activeIndex === TRANSLATE_SLICE_INDEX ? 0 : translateSwiper.current.activeIndex;
                setTranslateIndex(dynamicIndex);
                setUseLocalTranslation(localTranslate);
                localStorage.setItem("translateIndex", dynamicIndex);
                translateSwiper.current.destroy();
                translateSwiper.current = null;
            }
            if (summarySwiper.current) {
                let dynamicIndex = !localSummary && summarySwiper.current.activeIndex === SUMMARY_SLICE_INDEX ? 0 : summarySwiper.current.activeIndex;
                setSummaryIndex(dynamicIndex);
                //setUseLocalSummarization(localSummary);
				localStorage.setItem("summaryIndex", dynamicIndex);
                summarySwiper.current.destroy();
                summarySwiper.current = null;
            }
			// Save endpoint override no matter empty or non-empty so that user can disable
			localStorage.setItem("transcriptEndpoint", endpoints[0]);
			localStorage.setItem("translateEndpoint", endpoints[1]);
			localStorage.setItem("summaryEndpoint", endpoints[2]);
			//console.log("[App] [Debug] New states:", localTranscript, localTranslate, localSummary);
            configSwiper.current.destroy();
            configSwiper.current = null;
        }
    }, [showConfigCard]);

    const closeCardAnimation = (cardId) => {
        const card = document.getElementById(cardId);
        card.classList.add("motion-scale-out-0");
		card.classList.add("motion-duration-1000/scale");
		card.classList.add("motion-opacity-out-0");
		card.classList.add("motion-duration-125/opacity")
    };

    const handleClick = (card) => {
        switch (card) {
            case "config":
                setShowConfigCard(true);
                break;
            default:
                break;
        }
    };

    const handleCancel = (card) => {
        switch (card) {
            case "config":
                closeCardAnimation("ConfigCard");
                setTimeout(() => {
                    setShowConfigCard(false); // Match the duration of the animation
                }, 500);
                break;
            default:
                break;
        }
    };
	
	const updateEndpoint = (index, value) => {
		setEndpoints((prev) => {
			const newEndpoints = [...prev];
			newEndpoints[index] = value;
			return newEndpoints;
		});
	};
	
	const updateKey = (index, value) => {
		setKeys((prev) => {
			const newKeys = [...prev];
			newKeys[index] = value;
			return newKeys;
		});
	};

    function initSwiper(swiperName, initialSlide) {
        return new Swiper(`.${swiperName}-container`, {
            modules: [Pagination],
            slidesPerView: 3,
            centeredSlides: true,
            spaceBetween: 25,
            initialSlide: initialSlide,
            pagination: {
                el: `.${swiperName}-pagination`,
                clickable: true,
            },
            on: {
                slideChange: () => {
                    setTimeout(() => {
                        const slides = document.querySelectorAll(`.${swiperName}-slide`);
                        slides.forEach((slide) => {
                            slide.classList.remove("outline-blue-500", "outline-2", "outline", "rounded-2xl");
                        });
                        const activeSlide = document.querySelector(`.${swiperName}-slide.swiper-slide-active`);
                        if (activeSlide) {
                            activeSlide.classList.add("outline-blue-500", "outline-2", "outline", "rounded-2xl");
                        }
                    }, 0);
                },
            },
        });
    }

    function toggleSlides(swiperName, sliceIndex, state) {
		let invertedState = !state;
		switch(swiperName) {
			case "transcript":;
				transcriptSwiper.current.update();
				transcriptSwiper.current.slideTo(invertedState ? transcriptIndex : sliceIndex + transcriptIndex);
				transcriptSwiper.current.slides = invertedState ? transcriptSwiper.current.slides.slice(0, sliceIndex) : transcriptSwiper.current.slides.slice(sliceIndex);
				transcriptSwiper.current.slidesGrid = invertedState ? transcriptSwiper.current.slidesGrid.slice(0, sliceIndex) : transcriptSwiper.current.slidesGrid.slice(sliceIndex);
				transcriptSwiper.current.slidesSizesGrid = invertedState ? transcriptSwiper.current.slidesSizesGrid.slice(0, sliceIndex) : transcriptSwiper.current.slidesSizesGrid.slice(sliceIndex);
				transcriptSwiper.current.snapGrid = invertedState ? transcriptSwiper.current.snapGrid.slice(0, sliceIndex) : transcriptSwiper.current.snapGrid.slice(sliceIndex);
				transcriptSwiper.current.pagination.bullets = invertedState ? transcriptSwiper.current.pagination.bullets.slice(0, sliceIndex) : transcriptSwiper.current.pagination.bullets.slice(sliceIndex);
				transcriptSwiper.current.pagination.render();
				transcriptSwiper.current.pagination.update();
				initBorder();
				break;
			case "translate":
				translateSwiper.current.update();
				translateSwiper.current.slideTo(invertedState ? translateIndex : sliceIndex + translateIndex);
				translateSwiper.current.slides = invertedState ? translateSwiper.current.slides.slice(0, sliceIndex) : translateSwiper.current.slides.slice(sliceIndex);
				translateSwiper.current.slidesGrid = invertedState ? translateSwiper.current.slidesGrid.slice(0, sliceIndex) : translateSwiper.current.slidesGrid.slice(sliceIndex);
				translateSwiper.current.slidesSizesGrid = invertedState ? translateSwiper.current.slidesSizesGrid.slice(0, sliceIndex) : translateSwiper.current.slidesSizesGrid.slice(sliceIndex);
				translateSwiper.current.snapGrid = invertedState ? translateSwiper.current.snapGrid.slice(0, sliceIndex) : translateSwiper.current.snapGrid.slice(sliceIndex);;
				translateSwiper.current.pagination.bullets = invertedState ? translateSwiper.current.pagination.bullets.slice(0, sliceIndex) : translateSwiper.current.pagination.bullets.slice(sliceIndex);
				translateSwiper.current.pagination.render();
				translateSwiper.current.pagination.update();
				initBorder();
				break;
			case "summary":
				summarySwiper.current.update();
				summarySwiper.current.slideTo(invertedState ? summaryIndex : sliceIndex + summaryIndex);
				summarySwiper.current.slides = invertedState ? summarySwiper.current.slides.slice(0, sliceIndex) : summarySwiper.current.slides.slice(sliceIndex);
				summarySwiper.current.slidesGrid = invertedState ? summarySwiper.current.slidesGrid.slice(0, sliceIndex) : summarySwiper.current.slidesGrid.slice(sliceIndex);
				summarySwiper.current.slidesSizesGrid = invertedState ? summarySwiper.current.slidesSizesGrid.slice(0, sliceIndex) : summarySwiper.current.slidesSizesGrid.slice(sliceIndex);
				summarySwiper.current.snapGrid = invertedState ? summarySwiper.current.snapGrid.slice(0, sliceIndex) : summarySwiper.current.snapGrid.slice(sliceIndex);;
				summarySwiper.current.pagination.bullets = invertedState ? summarySwiper.current.pagination.bullets.slice(0, sliceIndex) : summarySwiper.current.pagination.bullets.slice(sliceIndex);
				summarySwiper.current.pagination.render();
				summarySwiper.current.pagination.update();
				initBorder();
				break;
			default:
				break;
		}
		let activeIndex = Array.from(document.querySelectorAll(`div#${swiperName}-wrapper > div.${swiperName}-slide`)).findIndex(slide => slide.classList.contains('swiper-slide-active'));
		switch (swiperName) {
			case "transcript":
				activeIndex -= invertedState ? 0 : TRANSCRIPT_SLICE_INDEX;
				break;
			case "translate":
				activeIndex -= invertedState ? 0 : TRANSLATE_SLICE_INDEX;
				break;
			case "summary":
				activeIndex -= invertedState ? 0 : SUMMARY_SLICE_INDEX;
				break;
			default:
				break;
		}
		const activeBullet = document.querySelectorAll(`div.${swiperName}-pagination > span.swiper-pagination-bullet`)[activeIndex];
		if (activeBullet) {
			activeBullet.classList.add('swiper-pagination-bullet-active');
		}
	}

    function initBorder() {
		// Add blue border to the initial active slides
        setTimeout(() => {
            const initialSlides = [
                ...document.querySelectorAll(".transcript-slide.swiper-slide-active"),
                ...document.querySelectorAll(".translate-slide.swiper-slide-active"),
                ...document.querySelectorAll(".summary-slide.swiper-slide-active")
            ];
            if (initialSlides) {
                initialSlides.forEach((slide) => {
                    slide.classList.add("outline-blue-500", "outline-2", "outline", "rounded-2xl");
                });
            }
        }, 0);
    }

    return (
        <>
            <button
                className="border px-4 py-2 rounded-lg bg-blue-400 text-black dark:text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
                onClick={() => handleClick("config")}
            >
                Configuration
            </button>
            {showConfigCard && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-50 motion-scale-in-50 motion-duration-500/scale" id="ConfigCard">
                    <div className="bg-white dark:bg-gray-800 border-2 border-gray-700 p-6 rounded-lg shadow-lg md:max-w-md max-w-sm relative">
                        <div className="swiper config-container mb-4">
                            <div className="swiper-wrapper">
                                <div className="swiper-slide">
									<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
										Model Configuration
										<SoftwareIcon />
									</h2>
									<div className="mb-4">
										<p>You can configurate your model profile here. It will be saved after clicking close and you do not need to set it again next time you visit this app.</p>
									</div>
									{/* Transcription Swiper */}
									<div className="relative">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Transcription Model
											<TranscriptIcon />
										</h3>
										<div className="swiper transcript-container relative mt-2 mb-2 md:mt-1 md:mb-1">
											<div className="swiper-wrapper pt-2 pb-2 md:pt-1 md:pb-1" id="transcript-wrapper">
												{/* Transcription slides */}
												<div className="swiper-slide transcript-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranscript ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<PhoneIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Whisper</span></div>
															<div><span className="text-sm italic">39M, Tiny</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide transcript-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranscript ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<LaptopIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Whisper</span></div>
															<div><span className="text-sm italic">74M, Base</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide transcript-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranscript ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<Desktop2Icon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Whisper</span></div>
															<div><span className="text-sm italic">244M, Small</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide transcript-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranscript ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<Desktop2Icon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Whisper</span></div>
															<div><span className="text-sm italic">809M, Turbo</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide transcript-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square ${localTranscript ? "motion-opacity-out-[0%]" : "motion-opacity-in-[0%]"}`}>
														<div>
															<div><span className="text-xl font-semibold">Whisper</span></div>
															<div><span className="text-sm italic">Cloud Server</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
											</div>
											<div className="swiper-pagination transcript-pagination motion-opacity-in-[0%]"></div>
										</div>
										<span
											className="absolute top-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-700 rounded flex items-center gap-1 cursor-pointer select-none"
											onClick={() => {
												setLocalTranscript(!localTranscript);
												localStorage.setItem("localTranscript", !localTranscript);
												toggleSlides("transcript", TRANSCRIPT_SLICE_INDEX, localTranscript);
											}}
										>
											<FilterIcon />
											Filter by:{' '}
											{localTranscript ? "Offline" : "Online"}
											{localTranscript ? <OfflineIcon /> : <OnlineIcon />}
										</span>
									</div>

									{/* Translation Swiper */}
									<div className="relative">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Translation Model
											<TranslateIcon />
										</h3>
										<div className="swiper translate-container relative mt-2 mb-2 md:mt-1 md:mb-1">
											<div className="swiper-wrapper pt-2 pb-2 md:pt-1 md:pb-1" id="translate-wrapper">
												{/* Translation slides */}
												<div className="swiper-slide translate-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranslate ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<PhoneIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">NLLB</span></div>
															<div><span className="text-sm italic">600M, Small</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide translate-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranslate ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<LaptopIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">NLLB</span></div>
															<div><span className="text-sm italic">1.3B, Medium</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide translate-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localTranslate ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<Desktop2Icon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">NLLB</span></div>
															<div><span className="text-sm italic">3.3B, Large</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide translate-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square ${localTranslate ? "motion-opacity-out-[0%]" : "motion-opacity-in-[0%]"}`}>
														<div>
															<div><span className="text-xl font-semibold">NLLB</span></div>
															<div><span className="text-sm italic">Cloud Server</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide translate-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square ${localTranslate ? "motion-opacity-out-[0%]" : "motion-opacity-in-[0%]"}`}>
														<div>
															<div><span className="text-xl font-semibold">DeepL</span></div>
															<div><span className="text-sm italic">Cloud Server</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<DeepLIcon />
														</div>
													</div>
												</div>
											</div>
											<div className="swiper-pagination translate-pagination motion-opacity-in-[0%]"></div>
										</div>
										<span
											className="absolute top-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-700 rounded flex items-center gap-1 cursor-pointer select-none"
											onClick={() => {
												setLocalTranslate(!localTranslate);
												localStorage.setItem("localTranslate", !localTranslate);
												toggleSlides("translate", TRANSLATE_SLICE_INDEX, localTranslate);
											}}
										>
											<FilterIcon />
											Filter by:{' '}
											{localTranslate ? "Offline" : "Online"}
											{localTranslate ? <OfflineIcon /> : <OnlineIcon />}
										</span>
									</div>

									{/* Summary Swiper */}
									<div className="relative">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Summary Model
											<SummaryIcon />
										</h3>
										<div className="swiper summary-container relative mt-2 mb-2 md:mt-1 md:mb-1">
											<div className="swiper-wrapper pt-2 pb-2 md:pt-1 md:pb-1" id="summary-wrapper">
												{/* Summary slides */}
												<div className="swiper-slide summary-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localSummary ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<PhoneIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Llama</span></div>
															<div><span className="text-sm italic">1B, Tiny</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide summary-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localSummary ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<LaptopIcon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Llama</span></div>
															<div><span className="text-sm italic">3B, Small</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide summary-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square relative overflow-hidden ${localSummary ? "motion-opacity-in-[0%]" : "motion-opacity-out-[0%]"}`}>
														<div className="absolute top-0 right-0 flex justify-end items-start p-1.5">
															<Desktop2Icon />
														</div>
														<div>
															<div><span className="text-xl font-semibold">Llama</span></div>
															<div><span className="text-sm italic">8B, Medium</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<MetaIcon />
														</div>
													</div>
												</div>
												<div className="swiper-slide summary-slide">
													<div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl flex justify-center items-center aspect-square ${localSummary ? "motion-opacity-out-[0%]" : "motion-opacity-in-[0%]"}`}>
														<div>
															<div><span className="text-xl font-semibold">GPT-4o</span></div>
															<div><span className="text-sm italic">Cloud Server</span></div>
														</div>
														<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
															<OpenAIIcon />
														</div>
													</div>
												</div>
											</div>
											<div className="swiper-pagination summary-pagination motion-opacity-in-[0%]"></div>
										</div>
										<span
											className="absolute top-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-700 rounded flex items-center gap-1 cursor-pointer select-none"
											onClick={() => {
												setLocalSummary(!localSummary);
												localStorage.setItem("localSummary", !localSummary);
												toggleSlides("summary", SUMMARY_SLICE_INDEX, localSummary);
											}}
										>
											<FilterIcon />
											Filter by:{' '}
											{localSummary ? "Offline" : "Online"}
											{localSummary ? <OfflineIcon /> : <OnlineIcon />}
										</span>
									</div>
                                </div>
								{/* API Override Page */}
                                <div className="swiper-slide">
									<h2 className="text-xl font-bold mb-4 flex items-center gap-1">
										API Override
										<EditIcon />
									</h2>
									<div className="mb-4">
										<p>If the host of this Web App or Huggingface Space has not provided API for server-side/cloud computation, you can manually override here.</p>
									</div>
									<div className="mb-2 md:mb-4">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Transcription Model
											<TranscriptIcon />
										</h3>
										<div className="mb-2 md:mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
											<div className="space-y-3">
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Endpoint</span>
													<span className="py-2 px-3 block w-full rounded-e-lg text-sm bg-white dark:bg-gray-900 flex items-center">
														<span className="whitespace-nowrap">{"https://"}</span>
														<input
															type="text"
															className="text-sm dark:bg-gray-900 bg-white dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none flex-grow"
															placeholder="Your API Endpoint"
															value={endpoints[0]}
															onChange={(e) => updateEndpoint(0, e.target.value)}
														/>
													</span>
												</div>
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Secret</span>
													<input
														type="password"
														className="py-2 px-3 block w-full rounded-e-lg bg-white text-sm dark:bg-gray-900 dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none"
														placeholder="Your API Key"
														value={keys[0]}
														onChange={(e) => updateKey(0, e.target.value)}
													/>
												</div>
											</div>
										</div>
									</div>
									<div className="mb-2 md:mb-4">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Translation Model
											<TranslateIcon />
										</h3>
										<div className="mb-2 md:mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
											<div className="space-y-3">
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Endpoint</span>
													<span className="py-2 px-3 block w-full rounded-e-lg text-sm bg-white dark:bg-gray-900 flex items-center">
														<span className="whitespace-nowrap">{"https://"}</span>
														<input
															type="text"
															className="text-sm dark:bg-gray-900 bg-white dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none flex-grow"
															placeholder="Your API Endpoint"
															value={endpoints[1]}
															onChange={(e) => updateEndpoint(1, e.target.value)}
														/>
													</span>
												</div>
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Secret</span>
													<input
														type="password"
														className="py-2 px-3 block w-full rounded-e-lg bg-white text-sm dark:bg-gray-900 dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none"
														placeholder="Your API Key"
														value={keys[1]}
														onChange={(e) => updateKey(1, e.target.value)}
													/>
												</div>
											</div>
										</div>
									</div>
									<div className="mb-2 md:mb-4">
										<h3 className="text-lg font-bold mb-2 flex items-center gap-1">
											Summary Model
											<SummaryIcon />
										</h3>
										<div className="mb-2 md:mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
											<div className="space-y-3">
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Endpoint</span>
													<span className="py-2 px-3 block w-full rounded-e-lg text-sm bg-white dark:bg-gray-900 flex items-center">
														<span className="whitespace-nowrap">{"https://"}</span>
														<input
															type="text"
															className="text-sm dark:bg-gray-900 bg-white dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none flex-grow"
															placeholder="Your API Endpoint"
															value={endpoints[2]}
															onChange={(e) => updateEndpoint(2, e.target.value)}
														/>
													</span>
												</div>
												<div className="flex rounded-lg">
													<span className="px-3 py-2 inline-flex items-center min-w-fit rounded-s-md bg-gray-200 text-sm dark:bg-gray-800">Secret</span>
													<input
														type="password"
														className="py-2 px-3 block w-full rounded-e-lg bg-white text-sm dark:bg-gray-900 dark:placeholder-neutral-500 focus:ring-0 border-0 focus:outline-none"
														placeholder="Your API Key"
														value={keys[2]}
														onChange={(e) => updateKey(2, e.target.value)}
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
                            </div>
                        </div>
						<div className="swiper-pagination config-pagination"></div>
                        <button
                            className="absolute top-2 right-2 px-2 text-sm bg-white dark:bg-gray-800 rounded"
                            onClick={() => handleCancel("config")}
                        >
                            ⨯
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModelSelector;