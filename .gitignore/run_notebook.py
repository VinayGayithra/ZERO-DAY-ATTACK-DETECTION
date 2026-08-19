import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
from pathlib import Path

nb_path = Path('init.ipynb')
nb = nbformat.read(nb_path, as_version=4)
client = NotebookClient(nb, timeout=600, kernel_name='python3')
try:
    client.execute()
    print('EXECUTED_OK')
except CellExecutionError as e:
    print('CELL_ERROR_START')
    print('Cell index:', e.cell_index)
    print('Cell source:', e.cell.source[:400])
    print('Error name:', type(e).__name__)
    print('Error message:', e.ename)
    print('Error traceback:')
    for line in e.traceback:
        print(line)
    print('CELL_ERROR_END')
except Exception as e:
    import traceback
    traceback.print_exc()
