import { ColItem, TwoColumnsResponsive, TextPageContainer } from "../components/elements";
import Modal from "../components/modal";
import React, { useState } from 'react';

function DemosList({posts}) {
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    return (
        <TextPageContainer style={{backgroundColor: '#1C1918',}}>
            <div style={{ width: '100%', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: 'white', textAlign: 'left', marginBottom: 30, width: '100%', maxWidth: 790, fontSize: 40}}>
                    Demos
                </div>
                <div style={{ maxWidth: 790, width: '100%' }}>
                    <div style={{ maxWidth: '100%', display: 'grid', gridTemplateColumns: "repeat(auto-fit, 250px)", gridGap: "20px", alignSelf: 'center' }}>
                        {/* not sure if I can handle a job, at least till I quit boom */}
                        {posts.posts.map((elem, index)=>{
                            return <>
                            <ColItem action={() => { setShowModal(true); setModalContent(<div>{elem.body}</div>) }}>
                            {elem.title}
                            </ColItem>
                            </>
                        })}
                    </div>
                </div>
            </div>
            <Modal showModal={showModal} closeModal={() => { setShowModal(false) }}>
                {modalContent}
            </Modal>
        </TextPageContainer>
    )
}

DemosList.getInitialProps = async ({ req }) => {
    const json = {posts: [
        {title: 'Eye-See: VR Glaucoma Test', body: `Glaucoma is the second leading global cause of blindness. Over 1 million cases occur annually in India, with many going undiagnosed.

EyeSee is a portable visual field testing device using a VR headset. It is a frugal alternative to the Humphrey method of testing, commonly used by ophthalmologists to detect blind spots. When taking the test, the user is presented with flashing dots at various locations in the field of view and responds by giving signals (button clicks) when they see a dot. A DIY test promotes early diagnosis and awareness in remote and rural regions without sophisticated testing labs.
        
Winner at Carl Zeiss Bi-Nation Hackathon 2018 (Manufacturers of Humphrey Apparatus).\n\n
        
Innovate for Society Award from Accenture Innovation Challenge 2018.
        `},
        {title: 'snAPI - REST api from JSON', body: `A backend server that creates dynamic REST API endpoints from JSON input. We won the Social Media award at PESU InGenius 2015.
        `}, 
        {title: 'Broget: Raspberry Pi Content Distribution Network', body: `Broget is a way to remotely download and transfer files to circumvent difficult network environments. Broget can remotely start downloads while you're outside and sync them when you get home. Broget can be used to serve content to customers in retail stores.

The Under 25 Summit
We were given exclusive passes to attend the launch of Startup India by PM Narendra Modi in Delhi. We were the youngest attendees at the event.`}]}
    return { posts: json }
  }
  
export default DemosList;
