# Gator
***

# Installation steps

Before going further into the project, you need to have `uv` (ref. https://github.com/astral-sh/uv) and `ffmpeg` ref. installed on your computer.

This being installed, you would have to also have `git-lfs` installed to download the checkpoints of the models.


# Run the application

After all requirements are well installed, run the following bash command:
```
./run_app.sh
```

# Laaunch the backend server

```uv run uvicorn server:app --host 0.0.0.0 --port 8000```



# Available commands

```
http GET localhost:8000/health
http GET localhost:8000/detect
```