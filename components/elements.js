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
    return (<ContentTile style={{ width: '250px', height: '250px', backgroundColor: getRandomColor(['#53608C', '#8C6671', '#91876A', '#688C6C']) }} onClick={() => { console.log(props); action && action() }}>
        <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', fontSize: 24, fontWeight: '300'}}>
            {children}
        </div>
    </ContentTile>)
}

export const getRandomColor = (array) => {
    return array[Math.floor(Math.random() * array.length)];
}

export const ContentTile = styled.div`
background-color: white;
border-radius: 5px;
padding: 10px;
transition: 0.2s;
background: #ffffff;
cursor: pointer;
white-space: pre-wrap;
&:hover{
    // background: linear-gradient(145deg, #e6e6e6, #ffffff);
    
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