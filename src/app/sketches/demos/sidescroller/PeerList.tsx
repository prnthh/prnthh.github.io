import React, { useState } from 'react'

type PeerState = { position: [number, number, number], appearance: { [key: string]: any } }
export default function PeerList({ peerStates, room, sendChat }: {
    peerStates: Record<string, PeerState>,
    room: any,
    sendChat: (msg: string, peer?: string) => void
}) {
    const [peerOptions, setPeerOptions] = useState<string | null>(null)
    const [showDM, setShowDM] = useState<string | null>(null)
    const [dmInput, setDmInput] = useState('')
    return (
        <div className="min-w-[100px] mr-3 border-r border-[#444] pr-2">
            <div className="font-bold mb-1">Peers:</div>
            <ul className="list-none m-0 p-0">
                {Object.entries(peerStates).map(([peerId, state]) => (
                    <li key={peerId} className="text-[12px] mb-0.5 relative">
                        {peerId.slice(0, 8)}
                        {/* Example: show position and appearance */}
                        {/* <span className="ml-1 text-[#aaa]">({state.position.join(', ')})</span> */}
                        {state.appearance && <span className="ml-1 text-[#8cf]">{JSON.stringify(state.appearance)}</span>}
                        <button
                            className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#333] text-[#8cf] border-none cursor-pointer"
                            onClick={e => {
                                e.stopPropagation();
                                setPeerOptions(peerId);
                            }}
                        >
                            &#x22EE;
                        </button>
                        {peerOptions === peerId && (
                            <div className="absolute right-0 bottom-[18px] bg-[#222] border border-[#444] rounded-lg z-[1002] min-w-[80px]">
                                <button
                                    className="block w-full bg-none text-[#8cf] border-none px-1.5 py-1.5 text-left cursor-pointer"
                                    onClick={() => {
                                        setShowDM(peerId);
                                        setPeerOptions(null);
                                    }}
                                >DM</button>
                                <button
                                    className="block w-full bg-none text-[#f88] border-none px-1.5 py-1.5 text-left cursor-pointer"
                                    onClick={() => {
                                        try {
                                            const peerConn = room.getPeers()[peerId];
                                            if (peerConn) peerConn.close();
                                        } catch (err) { }
                                        setPeerOptions(null);
                                    }}
                                >Kick</button>
                            </div>
                        )}
                    </li>
                ))}
                {showDM && (
                    <div className="fixed left-0 top-0 w-screen h-screen bg-black/50 z-[2000] flex items-center justify-center" onClick={() => setShowDM(null)}>
                        <div className="bg-[#222] p-5 rounded-xl min-w-[300px]" onClick={e => e.stopPropagation()}>
                            <div className="mb-2.5 text-[#8cf]">DM to {showDM.slice(0, 8)}</div>
                            <input
                                type="text"
                                autoFocus
                                className="w-full p-2 rounded border-none bg-[#333] text-white mb-2.5"
                                value={dmInput}
                                onChange={e => setDmInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && dmInput.trim()) {
                                        sendChat(dmInput, showDM);
                                        setShowDM(null);
                                        setDmInput('');
                                    }
                                }}
                                placeholder="Type a DM..."
                            />
                            <button className="bg-[#8cf] text-[#222] border-none rounded px-3 py-1 cursor-pointer" onClick={() => {
                                if (dmInput.trim()) {
                                    sendChat(dmInput, showDM);
                                    setShowDM(null);
                                    setDmInput('');
                                }
                            }}>Send</button>
                        </div>
                    </div>
                )}
            </ul>
        </div>
    )
}
