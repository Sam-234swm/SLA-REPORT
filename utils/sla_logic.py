import pandas as pd
import re
from datetime import datetime, timedelta

def clean_cell(val):
    if pd.isna(val): return val
    return re.sub(r'=\("?([^"]+)"?\)?', r'\1', str(val)).strip()

def process_sla_data(file_path, user_date_str):
    df_raw = pd.read_csv(file_path, engine="python", on_bad_lines='skip')
    df = df_raw.applymap(clean_cell)

    df['Order Date'] = pd.to_datetime(df['Order Date'], format="%d/%m/%Y %I:%M %p", errors='coerce')
    df['End Time (Actual)'] = pd.to_datetime(df['End Time (Actual)'], format="%d/%m/%Y %I:%M %p", errors='coerce')

    valid_stores = [
        "BLR_kalyan-nagar", "BLR_koramangala", "CH_Periyamet",
        "DEL_malviya-nagar", "HYD_manikonda", "KOL-Topsia",
        "MUM_andheri", "PUN_koregaon-park"
    ]
    df = df[df['Order Dark Store'].isin(valid_stores)]
    df = df[df['Order Status'].str.lower() == "delivered"]

    selected_date = datetime.strptime(user_date_str, "%d/%m/%Y").date()
    df = df[df['End Time (Actual)'].dt.date == selected_date]

    df['Delivery Type'] = df['Order Date'].apply(
        lambda x: "Quick" if pd.notna(x) and 0 <= x.hour < 15 else "Non Quick"
    )

    df['TAT'] = df['Order Date'].apply(
        lambda x: x.replace(hour=23, minute=59, second=59) if pd.notna(x) and x.hour < 15
        else (x + timedelta(days=1)).replace(hour=23, minute=59, second=59) if pd.notna(x)
        else pd.NaT
    )

    df['SLA Status'] = df.apply(
        lambda row: "SLA Breach" if pd.notna(row['End Time (Actual)']) and pd.notna(row['TAT']) and row['End Time (Actual)'] > row['TAT']
        else "SLA Met" if pd.notna(row['End Time (Actual)']) and pd.notna(row['TAT'])
        else "NA",
        axis=1
    )

    summary = df.groupby(['Order Dark Store', 'SLA Status']).size().unstack(fill_value=0)
    summary = summary.rename(columns={'SLA Met': 'SLA MET COUNT', 'SLA Breach': 'SLA BREACH COUNT'})
    summary['TOTAL DELIVERED ORDERS'] = summary.sum(axis=1)
    summary['SLA MET%'] = round(summary['SLA MET COUNT'] / summary['TOTAL DELIVERED ORDERS'] * 100).astype(int)
    summary['SLA BREACH%'] = 100 - summary['SLA MET%']

    grand_total = pd.DataFrame(summary.sum(numeric_only=True)).T
    grand_total.index = ['Grand Total']
    grand_total['SLA MET%'] = round(grand_total['SLA MET COUNT'] / grand_total['TOTAL DELIVERED ORDERS'] * 100).astype(int)
    grand_total['SLA BREACH%'] = 100 - grand_total['SLA MET%']

    summary_final = pd.concat([summary, grand_total])

    return df, summary_final
