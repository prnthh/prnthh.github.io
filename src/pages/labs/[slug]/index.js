import { useRouter } from 'next/router'
import Link from 'next/link'
import items from "./../../../content/labs";
import Section from "./../../../components/Section";
import Container from "react-bootstrap/Container";
import SectionHeader from "components/SectionHeader";
import Button from "react-bootstrap/Button"
import Head from 'next/head'

const NavigationButtons = ({previous, next}) => {

  var boxStyle = {
    padding: 4, marginBottom: 2,
  }

  var textStyle = {
    maxWidth: "10em",
    textAlign: "center",
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxHeight: "2.5em",
    fontSize: 14,
    lineHeight: "1.25em"
  }

  return <>
    <div style={{display:"flex", justifyContent: 'space-between'}}>
    <div>
      {previous && <Link href={`/labs/${encodeURIComponent(previous.url)}`} scroll={false}>
        <div style={{display: 'flex', alignItems: 'center', flexDirection:'row'}}>
            <div style={boxStyle}>{"«"}</div>
            <div style={textStyle}>{previous.title}</div>
        </div>
      </Link>}
    </div>
    <div>
      {next && <Link href={`/labs/${encodeURIComponent(next.url)}`} scroll={false}>
        <div style={{display: 'flex', alignItems: 'center', flexDirection:'row'}}>
          <div style={textStyle}>{next.title}</div>
          <div style={boxStyle}>{"»"}</div>
        </div>
      </Link>} 
    </div>
    </div>
  </>
}

const mapStringToP = (htmlString) => {
  return htmlString.split("\n").map((val)=>{
    return (<><p>{val}</p></>);
  })
}

const LabsPost = (props) => {
  const router = useRouter()
  const { slug } = router.query

  var postIndex;
  var item = props.post;

  postIndex = props.postIndex // items.findIndex(post);

  var prevPost, nextPost;
  prevPost = items[postIndex -1];
  nextPost = items[postIndex +1];

  return (
    <>
      <Head>
        <title>{item.title} - prnth.com</title>
        <meta name="description" content={item.body.substring(0, 120)} />
        <meta name="keywords" content="Pranith, Hengavalli, prnth, prnth.com, cryptocurrency, game developer, game design" />
      </Head>
      <Section
      bg="white"
      textColor="dark"
      size="sm"
      bgImage=""
      bgImageOpacity={1}
      >
      {item && 
        <Container>
        <SectionHeader
            title={item.title}
            subtitle={item.subtitle}
            size={2}
            spaced={true}
            className="text-center"
          />

          <NavigationButtons 
            previous={prevPost}
            next={nextPost}
          />

          <center>
            {item.image && <img style={{maxHeight: "20rem", width: 'auto'}} src={item.image} alt={item.title} variant="top" />}
          </center>
        
        <div style={{maxWidth: "700px", margin: "30px auto 20px auto"}}>
          {mapStringToP(item.body)}
        </div>

        <center>
          {item.buttons && item.buttons.map((button) => {
                return <a
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{padding: 5}}
                ><Button onClick={()=>{}}>
                  {button.label ? button.label : "Link"}
                </Button></a>
          })}
        </center>
        </Container>
        };
      </Section>
    </>
  )
}

// This function gets called at build time
export async function getStaticPaths() {
  // Call an external API endpoint to get posts
  // const res = await fetch('https://.../posts')
  // const posts = await res.json()
  const posts = items.map(item => {
    return item
  })

  // Get the paths we want to pre-render based on posts

  const paths = posts.map((item) => { 
    return ({
    params: { slug: item.url },
  })})

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  // params contains the post `id`.
  // If the route is like /posts/1, then params.id is 1
  // const res = await fetch(`https://.../posts/${params.id}`)
  // const post = await res.json()


  // Pass post data to the page via props
  var postIndex = 0;
  const post = items.filter((item, index) => {
      if (item.url == params.slug) {postIndex = index; return true}
    })[0]

  return { props: { slug: params.slug, post, postIndex } }
}

export default LabsPost