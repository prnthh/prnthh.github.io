import React from "react";

// --- NumberInput component ---
type NumberInputProps = {
    value: number | null;
    onChange: (v: number | null) => void;
    placeholder?: string;
    style?: React.CSSProperties;
};
export default function NumberInput({ value, onChange, placeholder, style }: NumberInputProps) {
    const safeValue = value === null || value === undefined ? 0 : value;
    const [input, setInput] = React.useState(String(safeValue));
    React.useEffect(() => {
        setInput(String(safeValue));
    }, [safeValue]);

    // --- Drag to change logic ---
    const draggingRef = React.useRef(false);
    const startXRef = React.useRef(0);
    const startValueRef = React.useRef<number | null>(null);
    const step = 0.1; // Change per pixel, can be made a prop

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
        draggingRef.current = true;
        startXRef.current = e.clientX;
        startValueRef.current = safeValue;
        document.body.style.cursor = 'ew-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingRef.current) return;
        if (startValueRef.current === null || isNaN(startValueRef.current)) return;
        const dx = e.clientX - startXRef.current;
        const newValue = startValueRef.current + dx * step;
        // Optionally round or clamp here
        setInput(String(newValue));
        onChange(newValue);
    };
    const handleMouseUp = () => {
        draggingRef.current = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
    React.useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        };
    }, []);
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        // Accept empty string as 0
        if (val === '' || val === '-' || val === '.' || val === '-.' || val === '+') {
            onChange(0);
            return;
        }
        // Accept numbers, including partials like 0., 1e-, etc.
        if (/^[-+]?\d*\.?\d*(e[-+]?\d*)?$/.test(val)) {
            const num = Number(val);
            if (!isNaN(num)) {
                onChange(num);
            }
        }
    };
    return (
        <input
            type="text"
            value={input}
            onChange={handleInput}
            placeholder={placeholder}
            style={style}
            onMouseDown={handleMouseDown}
        />
    );
}