import styled from 'styled-components'
import { FontResizer } from './elements';

const Modal = styled.div`
height: 100%; 
position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  transition: 0.1s;
  backdrop-filter: saturate(180%) blur(4px);
  opacity: 0;
  text-align: left;
  white-space: pre-wrap;
  pointer-events: none;
  ${props => props.showModal && `
    opacity: 1;
    pointer-events: auto;
  `}
`

const ModalContent = styled.div`
color: white;
background-color: rgba(36, 36, 38);
margin: 15% auto; /* 15% from the top and centered */
padding: 20px;
border-radius: 20px;
width: 40%;
z-index: 2;
@media screen and (max-width: 600px) {
    width: 90%;

  }
`

const ModalComponent = (props) => {
    const { children, showModal, closeModal } = props;
    console.log(showModal)
    return (<>
        <Modal showModal={showModal} onClick={() => { console.log(closeModal); closeModal && closeModal() }}>
            <ModalContent onClick={(e) => { e.stopPropagation() }} >
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <FontResizer small={"26px"} big={"32px"}>
                        <span style={{ cursor: 'pointer' }} onClick={() => { closeModal && closeModal() }}>&times;</span>
                    </FontResizer>
                </div>
                {children}
            </ModalContent>

        </Modal></>)
}


export default ModalComponent;