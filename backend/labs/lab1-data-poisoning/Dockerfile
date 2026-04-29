FROM python:3.11-slim

WORKDIR /lab

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    jupyter \
    notebook \
    pandas \
    numpy \
    scikit-learn \
    matplotlib \
    requests

COPY notebook.ipynb /lab/notebook.ipynb

EXPOSE 8888

CMD ["jupyter", "notebook", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--allow-root", \
     "--NotebookApp.token=", \
     "--NotebookApp.password=", \
     "--NotebookApp.allow_origin=*", \
     "--NotebookApp.disable_check_xsrf=True", \
     "--notebook-dir=/lab"]