export default function LoadingScreen({ text = "Loading...", zIndex = 20 }: { text?: string, zIndex?: number }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black" style={{ zIndex }}>
            <div className="text-white text-xl animate-pulse">{text}</div>
        </div>
    );
}