import { ReactNode } from "react"

const DraggableDiv = ({ children, position: [x, y] = [0, 0], onDrag }: { children: ReactNode, position?: [number, number], onDrag?: (pos: [number, number]) => void }) => {
    return (
        <div className="absolute"
            style={{ top: y, left: x, transform: 'translateX(-50%)' }}
            onPointerDown={(e) => {
                const el = e.currentTarget;
                if (!el.offsetParent) return;

                let lastX = e.clientX;
                let lastY = e.clientY;
                let left = parseFloat(el.style.left) || x;
                let top = parseFloat(el.style.top) || y;

                const onPointerMove = (e: PointerEvent) => {
                    left += e.clientX - lastX;
                    top += e.clientY - lastY;
                    lastX = e.clientX;
                    lastY = e.clientY;

                    el.style.left = `${left}px`;
                    el.style.top = `${top}px`;
                    onDrag?.([left, top]);
                };

                const onPointerUp = () => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
            }}
        >
            {children}
        </div>
    )
}

export default DraggableDiv;