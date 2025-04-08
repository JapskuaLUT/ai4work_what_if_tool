// ui/src/components/builder/BuilderLoadingState.tsx

export function BuilderLoadingState() {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium text-gray-700">
                    Loading coursework plan...
                </p>
            </div>
        </div>
    );
}
