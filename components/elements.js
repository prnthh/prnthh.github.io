import styled from 'styled-components'

export const TwoColumns = ({ children }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {children}
        </div>
    )
}

export const ColItem = (props) => {
    const { children, action } = props;
    console.log(props)
    return (<Neuomorphic style={{ width: '200px', height: '200px' }} onClick={() => { console.log(props); action && action() }}>
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {children}
        </div>
    </Neuomorphic>)
}

export const Neuomorphic = styled.div`
background-color: white;
box-shadow:  20px 20px 60px #d9d9d9, 
             -20px -20px 60px #ffffff;
border-radius: 30px;
transition: 0.2s;
background: #ffffff;
&:hover{
    background: linear-gradient(145deg, #e6e6e6, #ffffff);
}
`

export const TwoColumnsResponsive = styled.div`
display: flex;
flex-direction: row;
justify-content: space-between;
@media screen and (max-width: 600px) {
  flex-direction: column;
  justify-content: center;
  align-items: space-between;
}
`

export const TextPageContainer = styled.div`
         min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          @media screen and (max-width: 600px) {
            padding-top: 70px;
          }
`


export const FontResizer = styled.div`
font-size: ${props => props.big ? props.big : "20px"};
@media screen and (max-width: 600px) {
  font-size: ${props => props.big ? props.small : "12px"};
}
`