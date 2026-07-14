import React, { useState, useEffect } from "react";
import Markdown from 'react-markdown';
import { LanguageSelector as LanguageSelector1 } from './LanguageSelector1';
import LanguageSelector2 from './LanguageSelector2';
import { LANGUAGES, languageMapping } from '../utils/languages';
import { WindowExpandIcon, SpeedIcon, MemoryIcon } from './Glyph';

const LanguageBox = ({
    status,
    text,
    previewText, // Destructure previewText to hook it into the live markdown layouts
    output,
    language,
    targetLanguage,
    tps,
    setLanguage,
    setTargetLanguage,
}) => {
	const [ramUsage, setRamUsage] = useState('N/A');
	const [showLangCard, setShowLangCard] = useState(false); // State for Source Language and Target Language text-areas expanding
	
	// Update RAM usage every 10 second
	useEffect(() => {
		const updateRamUsage = async () => {
			if (performance && performance.measureUserAgentSpecificMemory) {
				try {
					const memoryUsage = await performance.measureUserAgentSpecificMemory();
					const usedMB = (memoryUsage.bytes / (1024 * 1024)).toFixed(2); // Convert bytes to MB
					setRamUsage(`${usedMB} MB`);
				} catch (error) {
					console.error('[App] Error measuring memory:', error);
					setRamUsage('Unavailable');
				}
			} else {
				setRamUsage('Unsupported');
			}
		};

		const interval = setInterval(updateRamUsage, 10000);
		return () => clearInterval(interval); // Cleanup on unmount
	}, []);
	
	const handleClick = (card) => {
		switch (card) {
			case "lang":
				setShowLangCard(true);
				break;
			default:
				console.log("[Dev] If you see this message, a card is not properly setup." );
				break;
		}
	}
	
	const handleCancel = (card) => {
		switch (card) {
			case "lang":
				const cardElement = document.getElementById("LanguageCard");
				cardElement.classList.add("motion-scale-out-0");
				cardElement.classList.add("motion-duration-250/scale")
				cardElement.classList.add("motion-translate-x-out-50")
				cardElement.classList.add("motion-translate-y-out-50")
				cardElement.classList.add("motion-duration-125/translate")
				cardElement.classList.add("motion-opacity-out-0");
				cardElement.classList.add("motion-duration-125/opacity")
				setTimeout(() => {
					setShowLangCard(false);
				}, 125)
				break;
			default:
				console.log("[Dev] If you see this message, a card is not properly setup." );
				break;
		}
	}
	
    if (status !== "ready") return null;

    // Helper to join the stable confirmed text tracking blocks cleanly with the active raw trail preview
    // Wraps live unconfirmed text blocks in *italics* while historical logs display as **bold**
	const formattedPreview = previewText?.trim() ? `*${previewText.trim()}*` : "";
	const fullSourceMarkdown = text ? `${text.trim()} ${formattedPreview}`.trim() : formattedPreview;

    return (
        <div className="relative mt-4 mb-4">
            {/* Whisper box */}
            <div className="relative mb-4">
                <h3 className="text-l font-semibold">
                    Source Language:{" "}
                    {Object.keys(LANGUAGES).find(
                        (key) => LANGUAGES[key] === languageMapping[language]
                    )}
                </h3>
                <div className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2 prose dark:prose-invert max-w-none text-base">
                    <Markdown>{fullSourceMarkdown}</Markdown>
                </div>
                <button
                    className="absolute top-1 right-1 px-1 text-sm bg-white dark:bg-gray-800 rounded"
                    onClick={() => handleClick("lang")}
                >
                    ⛶
                </button>
                <span className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
                    <SpeedIcon />
					Speed: {tps ? tps.toFixed(2) : "0.00"} tok/s
                </span>
            </div>

            {/* Translate box */}
            <div className="relative mb-4">
                <h3 className="text-l font-semibold">
                    Target Language:{" "}
                    {Object.keys(LANGUAGES).find(
                        (key) => LANGUAGES[key] === targetLanguage
                    )}
                </h3>
                <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
                    {output}
                </p>
                <span className="absolute bottom-1 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
                    <MemoryIcon />
					RAM Usage: {ramUsage}
                </span>
            </div>

            {/* Language selectors */}
            <div className="relative w-full flex md:flex-row justify-center">
                <p className="p-2 font-semibold">From</p>
                <LanguageSelector1
                    language={language}
                    setLanguage={setLanguage}
                />
                <p className="p-2 font-semibold">To</p>
                <LanguageSelector2
                    defaultLanguage={targetLanguage}
                    onChange={(x) => setTargetLanguage(x.target.value)}
                />
            </div>
			
			{/* Pop-up overlay for language text-area expanding */}
			{showLangCard && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 z-40 motion-scale-in-50 motion-duration-500/scale" id="LanguageCard">
					<div className="fixed bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full" style={{ height: '100%' }}>
						<div className="relative h-full">
							{/* Whisper box */}
							<div className="relative mb-4 h-[45%]">
								<h3 className="text-l font-semibold">Source Language: {Object.keys(LANGUAGES).find(key => LANGUAGES[key] === languageMapping[language])}</h3>
								<div className="w-full h-[calc(100%-40px)] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2 prose dark:prose-invert max-w-none text-base">
									<Markdown>{fullSourceMarkdown}</Markdown>
								</div>
								<button className="absolute top-1 right-1 px-1 text-sm bg-white dark:bg-gray-800 rounded" onClick={() => handleCancel('lang')}>
									⨯
								</button>
								<span className="absolute bottom-5 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
									<SpeedIcon />
									Speed: {tps ? tps.toFixed(2) : '0.00'} tok/s
								</span>
							</div>
							{/* Language Selection */}
							<div className="relative w-full flex md:flex-row justify-center">
								<p className="p-2 font-semibold">
									From
								</p>
								<LanguageSelector1
									language={language}
									setLanguage={(e) => {
										setLanguage(e);
									}}
								/>
								<p className="p-2 font-semibold">
									To
								</p>
								<LanguageSelector2
									defaultLanguage={targetLanguage}
									onChange={(x) => {
										setTargetLanguage(x.target.value);
									}}
								/>
							</div>
							{/* Translate box */}
							<div className="relative mt-6 h-[45%]">
								<h3 className="text-l font-semibold">Target Language: {Object.keys(LANGUAGES).find(key => LANGUAGES[key] === targetLanguage)}</h3>
								<p className="w-full h-[calc(100%-40px)] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
									{output}
								</p>
								<span className="absolute bottom-5 right-1 px-1 text-sm bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-1">
									<MemoryIcon />
									RAM Usage: {ramUsage}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
        </div>
    );
};

export default LanguageBox;