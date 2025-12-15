'use client'

import { useEffect } from 'react'
import useInputStore from '@/shared/providers/InputStore'

/**
 * Minimal drive input bridge.
 * Writes into `useInputStore` so the car can stay store-driven (no keyboard polling in the Vehicle).
 */
export default function DriveControls() {
    useEffect(() => {
        const down = new Set<string>()

        const updateAxes = () => {
            const forward = (down.has('KeyW') || down.has('ArrowUp')) ? 1 : 0
            const backward = (down.has('KeyS') || down.has('ArrowDown')) ? 1 : 0
            const left = (down.has('KeyA') || down.has('ArrowLeft')) ? 1 : 0
            const right = (down.has('KeyD') || down.has('ArrowRight')) ? 1 : 0

            // vertical: +forward, -back
            useInputStore.getState().setAxis('vertical', forward - backward)
            // horizontal: +right, -left
            useInputStore.getState().setAxis('horizontal', right - left)

            // Handbrake on Space (mapped to `aim` boolean to reuse existing state)
            useInputStore.getState().setButton('aim', down.has('Space'))
        }

        const onKeyDown = (e: KeyboardEvent) => {
            down.add(e.code)

            if (e.code === 'KeyR') {
                useInputStore.getState().tap()
            }

            updateAxes()
        }

        const onKeyUp = (e: KeyboardEvent) => {
            down.delete(e.code)
            updateAxes()
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        updateAxes()

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            // reset on unmount
            useInputStore.getState().setAxis('vertical', 0)
            useInputStore.getState().setAxis('horizontal', 0)
            useInputStore.getState().setButton('aim', false)
        }
    }, [])

    return null
}
