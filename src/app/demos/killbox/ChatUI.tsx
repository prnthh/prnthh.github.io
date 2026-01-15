import { useEffect, useState } from "react"
import { useLocalEntity } from "./core/GameStateStore"
import { GameRoom, BaseAction } from "./multiplayer/GameRoom"
import { ChatAction, MatchmakingAction } from "./multiplayer/LobbyRoom"

type LogEntry = {
    text: string
    gameId?: string  // If present, this is a joinable game link
}

type Props = {
    room: GameRoom<any, any>
    label?: string
    onJoinGame?: (gameId: string) => void
}

const ChatUI = ({ room, label, onJoinGame }: Props) => {
    const localEntity = useLocalEntity()
    const [mounted, setMounted] = useState(false)
    const [chatInput, setChatInput] = useState('')

    // Initialize logs with connection message
    const [logs, setLogs] = useState<LogEntry[]>(() => {
        const timestamp = new Date().toLocaleTimeString()
        const selfId = room.getSelfId()
        return [{ text: `[${timestamp}] Connected: ${selfId.slice(0, 8)}` }]
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Listen for incoming chat messages and peer events
    useEffect(() => {
        const unsubAction = room.onAction((action: BaseAction, peerId: string) => {
            const timestamp = new Date().toLocaleTimeString()

            if (action.type === 'chat') {
                const chatAction = action as ChatAction
                const senderName = chatAction.payload.senderName || peerId.slice(0, 8)
                setLogs(prev => [...prev.slice(-19), {
                    text: `[${timestamp}] ${senderName}: ${chatAction.payload.message}`
                }])
            } else if (action.type === 'matchmaking') {
                const mmAction = action as MatchmakingAction
                const senderName = mmAction.payload.senderName || peerId.slice(0, 8)
                const gameId = mmAction.payload.message
                setLogs(prev => [...prev.slice(-19), {
                    text: `[${timestamp}] ${senderName} started a game: `,
                    gameId
                }])
            }
        })

        const unsubJoin = room.onPeerJoin((peerId: string) => {
            const timestamp = new Date().toLocaleTimeString()
            setLogs(prev => [...prev.slice(-19), { text: `[${timestamp}] Joined: ${peerId.slice(0, 8)}` }])
        })

        const unsubLeave = room.onPeerLeave((peerId: string) => {
            const timestamp = new Date().toLocaleTimeString()
            setLogs(prev => [...prev.slice(-19), { text: `[${timestamp}] Left: ${peerId.slice(0, 8)}` }])
        })

        return () => {
            unsubAction()
            unsubJoin()
            unsubLeave()
        }
    }, [room])

    const sendChatMessage = () => {
        if (!chatInput.trim()) return
        const timestamp = new Date().toLocaleTimeString()
        const senderName = (localEntity as any)?.name || 'Me'
        // Add to local logs
        setLogs(prev => [...prev.slice(-19), { text: `[${timestamp}] ${senderName}: ${chatInput.trim()}` }])
        // Broadcast to peers
        room.broadcastAction({
            type: 'chat',
            payload: { message: chatInput.trim(), senderName: (localEntity as any)?.name || 'Anonymous' }
        })
        setChatInput('')
    }

    if (!mounted) return null

    const roomInfo = room.getInfo()

    return (
        <div className="font-xs p-1 w-[300px] text-white bg-black/75 border-white border rounded" style={{ maxHeight: '40vh', overflowY: 'auto', fontFamily: 'monospace' }}>
            <div className="flex justify-between">
                {label || roomInfo.id}
                <div>
                    {room.getPeers().length + 1} 🧑‍🧒‍🧒
                </div>
            </div>
            <div
                className="w-full text-xs overflow-y-auto"
                style={{ background: '#222', padding: '4px', height: '150px' }}
            >
                {logs.map((log, i) => (
                    <div key={i}>
                        {log.text}
                        {log.gameId && (
                            <button
                                onClick={() => onJoinGame?.(log.gameId!)}
                                style={{
                                    color: '#4af',
                                    textDecoration: 'underline',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    font: 'inherit'
                                }}
                            >
                                Join Game
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '4px', padding: '4px 6px', fontSize: '10px', color: 'white' }}
                />
                <button
                    onClick={sendChatMessage}
                    style={{ background: '#555', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', color: 'white', cursor: 'pointer' }}
                >
                    Send
                </button>
            </div>
        </div>
    )
}

export default ChatUI
