"use client";

const LoadingSpinner = () => {
    return (
        <div className="fixed inset-0 z-50 bg-[#1b1b1b] font-sans">
            <div className="absolute bottom-16 right-16 flex flex-col items-end gap-3">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-[0.2em] text-white">LOADING</h1>
                    <div className="flex gap-1.5">
                        <div className="h-2 w-2 bg-red-600 animate-pulse" />
                        <div className="h-2 w-2 bg-red-600 animate-pulse [animation-delay:0.15s]" />
                        <div className="h-2 w-2 bg-red-600 animate-pulse [animation-delay:0.3s]" />
                    </div>
                </div>
                <div className="h-0.5 w-full overflow-hidden bg-white/10">
                    <div className="h-full w-1/3 bg-red-600 animate-[slide_2s_ease-in-out_infinite]" />
                </div>
            </div>
            <style jsx>{`
                @keyframes slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
};

export default LoadingSpinner;