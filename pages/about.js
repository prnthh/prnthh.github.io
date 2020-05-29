import { TwoColumnsResponsive } from "../components/elements";
import Head from 'next/head'

export default function Home() {
    return (
        <div className={"container"}>
            <Head>

            </Head>
            <div style={{ width: '100%', maxWidth: '700px', padding: 20 }}>
                <TwoColumnsResponsive>
                    <h2 style={{ textAlign: 'center' }}>
                        About
                    </h2>
                    <div style={{ maxWidth: '500px' }}>
                        <p style={{ marginTop: 7 }}>I am an engineer, mostly for software stuff.</p>

                        <p>I work for Zynga as a game developer on the Farmville: Tropic Escape team.</p>

                        <p>I'm passionate about Virtual Reality, Gamification and Art.</p>

                        <p style={{ display: 'flex', flexDirection: 'row', marginTop: 40 }}>
                            <div className="social"><a href="https://github.com/prnthh" target="_blank">Git</a></div>
                            <div className="social"><a href="https://www.instagram.com/pranithisnotaswaggot/" target="_blank">IG</a> </div>
                            <div className="social"><a href="https://www.facebook.com/prnth" target="_blank">FB</a> </div>
                            <div className="social"><a href="https://www.linkedin.com/in/pranith-hengavalli-21b5834/" target="_blank">Li</a> </div>
                            <div className="social"><a href="/prnth-cv.pdf" target="_blank">Resume</a> </div>
                        </p>
                    </div>
                </TwoColumnsResponsive>
            </div>

            <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .social{
            padding-right: 25px;
        }

        a{
            color: black;
            text-decoration: none;
            border-bottom: 2px solid red;
            display: inline-block;
            line-height: 0.85;
            transition: 0.5s;
            padding: 6px 10px 4px;
        }
        a:hover{
            background-color: red;
        }
		`}
            </style>
        </div>
    )
}
