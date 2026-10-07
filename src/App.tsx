import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  Typography,
  Button,
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
    fontFamily: "sans-serif,Raleway",
  },
});

interface Project {
  title: string;
  body: string;
  link: string;
  timestamp: string;
}

// Created once at module load rather than on every render.
const supabaseClient = createClient(
  import.meta.env.REACT_APP_SUPABASE_URL,
  import.meta.env.REACT_APP_SUPABASE_KEY,
);

function App() {
  const [content, setContent] = useState<Project[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const { data, error } = await supabaseClient
        .from("things_i_made")
        .select("*")
        .order("timestamp", { ascending: true })
        .overrideTypes<Project[], { merge: false }>();

      if (error) {
        console.error("Failed to load things_i_made:", error);
        return;
      }
      if (!cancelled) {
        setContent(data);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="background">
        <Container
          maxWidth={false}
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
                  <Typography variant="h2" align={"center"} sx={{ fontWeight: 400 }}>
                    {c.title}
                  </Typography>
                </div>
                <div className="content-body">
                  <Typography variant="h6">{c.body}</Typography>
                  <div className="content-link">
                    <Button
                      href={c.link}
                      target="_blank"
                      variant={"contained"}
                      sx={{ width: "200px" }}
                    >
                      <Typography>jump on over</Typography>
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
      <div className="watermark">
        <p>a-crawley {new Date().getFullYear()}</p>
      </div>
      <div className="links">
        <a className="game-link" href="./game/">
          Look Up
        </a>
        <a href="https://github.com/A-Crawley" target="_blank" rel="noreferrer">
          <img src="./GitHub-Mark-120px-plus.png" alt="github" />
        </a>
      </div>
    </ThemeProvider>
  );
}

export default App;
