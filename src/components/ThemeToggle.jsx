import React, { useEffect } from "react";
import { SunIcon, MoonIcon } from "./Glyph";

const ThemeToggle = ({ isDarkMode, setIsDarkMode }) => {
    // Save theme state to local storage
    useEffect(() => {
        localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    useEffect(() => {
        const htmlElement = document.documentElement;
        if (isDarkMode) {
            htmlElement.classList.add("dark");
        } else {
            htmlElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    const handleToggle = () => {
        const button = document.querySelector('#themeToggle');
        const icon = button.querySelector('span');

        // Slide down the current icon
        icon.classList.add("slide-down");

        // After the slide-down animation completes, toggle the theme state
        setTimeout(() => {
            setIsDarkMode(!isDarkMode); // Toggle the theme state
            icon.classList.remove("slide-down");
            icon.classList.add("slide-up"); // Slide up the new icon
        }, 250); // Match the duration of the slide-down animation

        // Remove the slide-up animation class after it completes
        setTimeout(() => {
            icon.classList.remove("slide-up");
        }, 500); // Total duration of both animations
    };

    return (
        <button
            className="fixed top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full z-60 transition-colors duration-500"
            onClick={handleToggle}
        >
            <div id="themeToggle">
                <span className="text-gray-800 dark:text-gray-200 transition-colors duration-500 block">
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </span>
            </div>
        </button>
    );
};

export default ThemeToggle;