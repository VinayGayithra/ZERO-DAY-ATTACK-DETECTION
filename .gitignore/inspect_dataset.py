import pandas as pd
path = r'C:\Users\vinay t\OneDrive\Desktop\MAIN PROJ\SafeML\Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv'
df = pd.read_csv(path)
print('shape', df.shape)
print('columns', df.columns.tolist()[:40])
print('label cols', [c for c in df.columns if 'label' in c.lower()])
for c in df.columns[:10]:
    print(c, df[c].dtype)
print(df.head(2).to_dict(orient='records'))
