import styled from 'styled-components'

export function TwoColumns({ children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {children}
        </div>
    )
}

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

export const FontResizer = styled.div`
font-size: ${props => props.big ? props.big : "20px"};
@media screen and (max-width: 600px) {
  font-size: ${props => props.big ? props.small : "12px"};
}
`