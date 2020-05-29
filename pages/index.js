import Head from 'next/head'
import { FontResizer } from '../components/elements';

export default function Home() {
  return (
    <div className={"container"}>


      <FontResizer small={"8px"} big={"28px"}>
        <pre id="header1" onclick="showTwo()">{`
                ___                 _ _   _
               / _ \\_ __ __ _ _ __ (_) |_| |__
              / /_)/ '__/ _\` | '_ \\| | __| '_ \\
             / ___/| | | (_| | | | | | |_| | | |
             \\/    |_|  \\__,_|_| |_|_|\\__|_| |_|  _ _ _
           /\\  /\\___ _ __   __ _  __ ___   ____ _| | (_)
          / /_/ / _ \\ '_ \\ / _\` |/ _\` \\ \\ / / _\` | | | |        
         / __  /  __/ | | | (_| | (_| |\\ V / (_| | | | |
         \\/ /_/ \\___|_| |_|\\__, |\\__,_| \\_/ \\__,_|_|_|_|
                            |___/
        `}</pre>
      </FontResizer>
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
		`}
      </style>
    </div>
  )
}
