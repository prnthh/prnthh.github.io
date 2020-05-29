import { ColItem, TwoColumnsResponsive, TextPageContainer } from "../components/elements";
import Modal from "../components/modal";
import React, { useState } from 'react';

export default function Home() {
    const [showModal, setShowModal] = useState(false);
    return (
        <TextPageContainer>
            <div style={{ width: '100%', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 50 }}>
                    Demos
                </h2>
                <div style={{ maxWidth: 640, width: '100%' }}>
                    <div style={{ maxWidth: '100%', display: 'grid', gridTemplateColumns: "repeat(auto-fit, 200px)", gridGap: "20px", alignSelf: 'center' }}>
                        {/* not sure if I can handle a job, at least till I quit boom */}
                        <ColItem action={() => { setShowModal(true) }}>
                            HackOne
                        </ColItem>
                    </div>
                </div>
            </div>
            <Modal showModal={showModal} closeModal={() => { setShowModal(false) }}>Hello</Modal>
        </TextPageContainer>
    )
}
