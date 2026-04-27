"use client"

import { cn } from "./lib/utils";
import {
    AnimatePresence,
    MotionValue,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { DockExpandIcon } from "../Glyph";

export const FloatingDock = ({
    navigationItems,
    desktopClassName,
    mobileClassName,
}: {
    navigationItems: { label: string; icon: React.ReactNode; onClick: () => void }[];
    desktopClassName?: string;
    mobileClassName?: string;
}) => {
    return (
        <>
            <FloatingDockDesktop navigationItems={navigationItems} className={desktopClassName} />
            <FloatingDockMobile navigationItems={navigationItems} className={mobileClassName} />
        </>
    );
};

const FloatingDockMobile = ({
  navigationItems,
  className,
}: {
  navigationItems: { label: string; icon: React.ReactNode; onClick: () => void }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("fixed bottom-2 right-2 block md:hidden", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-600 transition-colors"
      >
        <motion.span
          className="text-xl"
          animate={{ rotate: open ? 180 : 0 }} // Rotate the arrow based on the `open` state
          transition={{ duration: 0.2 }} // Smooth transition
        >
			<DockExpandIcon />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 right-0 flex flex-col gap-2" // Adjusted to align to the right
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {navigationItems.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={item.onClick}
                  className="h-10 w-10 rounded-full bg-gray-50 dark:bg-gray-900 border flex items-center justify-center shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
					<div className="text-xl">{item.icon}</div> {/* Emoji as icon */}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FloatingDockDesktop = ({
    navigationItems,
    className,
}: {
    navigationItems: { label: string; icon: React.ReactNode; onClick: () => void }[];
    className?: string;
}) => {
    let mouseX = useMotionValue(Infinity);
    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
                "mx-auto hidden md:flex h-16 gap-4 items-end rounded-2xl bg-white dark:bg-gray-900 px-4 pb-3",
                className
            )}
        >
            {navigationItems.map((item) => (
                <IconContainer mouseX={mouseX} key={item.label} {...item} />
            ))}
        </motion.div>
    );
};

function IconContainer({
    mouseX,
    label,
    icon,
    onClick,
}: {
    mouseX: MotionValue;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    let ref = useRef<HTMLDivElement>(null);

    let distance = useTransform(mouseX, (val) => {
        let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

        return val - bounds.x - bounds.width / 2;
    });

    let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

    let widthTransformIcon = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    let heightTransformIcon = useTransform(
        distance,
        [-150, 0, 150],
        [40, 80, 40]
    );

    let width = useSpring(widthTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });
    let height = useSpring(heightTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    let widthIcon = useSpring(widthTransformIcon, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });
    let heightIcon = useSpring(heightTransformIcon, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            ref={ref}
            style={{ width, height }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            className="aspect-square rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center relative cursor-pointer"
        >
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 2, x: "-50%" }}
                        className="px-2 py-0.5 whitespace-pre rounded-md bg-gray-100 border dark:bg-gray-800 dark:border-gray-900 dark:text-white border-gray-200 text-gray-700 absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs"
                    >
                        {label}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                style={{ width: widthIcon, height: heightIcon }}
                className="flex items-center justify-center"
            >
                {icon}
            </motion.div>
        </motion.div>
    );
}