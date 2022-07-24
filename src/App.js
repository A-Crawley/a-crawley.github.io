import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  Typography,
  Button,
  getCardHeaderUtilityClass,
} from "@mui/material";
import "./App.css";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#FF9770",
    },
  },
  typography: {
    fontFamily: ["sans-serif", "Raleway"],
  },
});

function App() {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  const [content, setContent] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data: things_i_made, error } = await supabaseClient.from('things_i_made').select('*').order('timestamp', { ascending: true });
      return things_i_made;
    } 

    if (content === null) {
      fetchData().then((data) => {
        //console.log({data})
        setContent(data);
      })
    }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="background">
        <Container
          maxWidth={"true"}
          sx={{
            padding: "0 !important",
            height: "100vh",
            position: "relative",
            overflow: "clip",
          }}
        >
          <div className="cloud cloud-high cloud-slow">
            <div style={{ position: "relative" }}>
              <div className="cloud cloud-small left"></div>
            </div>
          </div>
          <div className="cloud cloud-low cloud-med">
            <div style={{ position: "relative" }}>
              <div className="cloud cloud-small right"></div>
            </div>
          </div>
          <div className="cloud cloud-mid cloud-fast">
            <div style={{ position: "relative" }}>
              <div className="cloud cloud-small mid"></div>
            </div>
          </div>
          <div className="logo">
            <div>
              <Typography variant="h1">AC</Typography>
            </div>
          </div>
        </Container>
      </div>
      <div className="content">
        {content?.map((c, i) => {
          return (
            <div className="content-item" key={i}>
              <div>
                <div className="content-title">
                  <Typography variant="h2" align={"center"} fontWeight={"400"}>
                    {c.title}
                  </Typography>
                </div>
                <div className="content-body">
                  <Typography variant="h6">
                    {c.body}
                  </Typography>
                  <div className="content-link">
                  <Button href={c.link}
                          target="_blank" 
                          variant={'contained'}
                          sx={{width: '200px'}}>
                    <Typography>
                      jump on over
                    </Typography>
                  </Button>
                </div>
                </div>
              </div>
              <div></div>  
            </div>
          );
        })}
        <div className="spacer"></div>
      </div>
    </ThemeProvider>
  );
}

export default App;
