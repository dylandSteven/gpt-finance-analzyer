from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time
import pandas as pd
import os
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
CSV_FILE_PATH = os.getenv('CSV_FILE_PATH')


driver = webdriver.Chrome()

def getFullAddress(_Ward, _Block, _Sub, _Parcel, _Consolidation):
    totalTax = 0; taxYears = 0

    driver.get('https://apps.shelbycountytrustee.com/TaxQuery/ParcelIDSearch.aspx?flag=0')

    Ward = driver.find_element(By.ID, 'Ward')
    Ward.send_keys(_Ward)
    Block = driver.find_element(By.ID, 'Block')
    Block.send_keys(_Block)
    SubNumber = driver.find_element(By.ID, 'SubNumber')
    SubNumber.send_keys(_Sub)
    Parcel = driver.find_element(By.ID, 'Parcel')
    Parcel.send_keys(_Parcel)
    Tag = driver.find_element(By.ID, 'Tag')
    Tag.send_keys(_Consolidation)

    Search = driver.find_element(By.ID, 'Search')
    Search.click()

    details = driver.find_element(By.ID, 'ownerFormView')
    details_text = details.text.split('Property Location: ')[1]
    details_text = details_text.split('Mailing Address:')[0]
    fullAddress = details_text.replace('\n', '')

    return fullAddress


def main():
    df = pd.read_csv(CSV_FILE_PATH)
    parcels = df['Parcel number'].tolist()

    if 'Full Address' not in df.columns: df['Full Address'] = ''
    df['Full Address'] = df['Full Address'].astype('str')

    for index in range(0, len(parcels)):
        parcel = parcels[index]
        if len(parcel) < 14:
            parcel = (14 - len(parcel)) * '0' + parcel
        Ward = parcel[0:3]
        Block = parcel[3:7]
        Sub = parcel[7:8]
        Parcel = parcel[8:13]
        Consolidation = parcel[13:14]

        try:
            fullAddress = getFullAddress(Ward, Block, Sub, Parcel, Consolidation)
            print("=", parcel, ",", fullAddress)
            df.at[index, 'Full Address'] = fullAddress
            df.to_csv(CSV_FILE_PATH, index=False)
        except Exception as e:
            print(str(e))
            with open('error_parcel_no', 'a') as f:
                f.write(parcel)

        time.sleep(2)


main()

driver.quit()

# 001 0010 I 00049 0