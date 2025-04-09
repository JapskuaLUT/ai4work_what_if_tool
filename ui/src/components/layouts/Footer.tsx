// ui/src/components/layouts/Footer.tsx

import { Heart } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t py-4 px-6 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                <div>
                    Created by{" "}
                    <a
                        href="https://www.lut.fi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        LUT University
                    </a>{" "}
                    as part of the AI4Work Project
                </div>

                <div className="mt-2 md:mt-0 flex items-center">
                    <span>Made with</span>
                    <Heart className="h-4 w-4 mx-1 text-red-500" />
                    <span>by</span>
                    <span className="ml-1 font-medium">
                        Janne Parkkila, Arsalan Khan, Eero Suomalainen |
                        firstname.lastname@lut.fi
                    </span>
                </div>

                <div className="mt-2 md:mt-0 text-gray-500">
                    © {currentYear}
                </div>
            </div>
        </footer>
    );
}
