# TREM
<img alt="Discord" src="https://img.shields.io/discord/926545182407688273">

------

- Taiwan Real-time Earthquake Monitoring ( 台灣實時地震監測 )

## 索引
- [文檔](#文檔)
- [發行](#發行)
- [貢獻者](#貢獻者)
- [截圖](#截圖)
- [發佈規則](#發佈規則)
- [合作](#合作)

## 文檔
### 整個畫面
![IMG_20220618_164017](https://user-images.githubusercontent.com/44525760/174438202-7722e4e3-dba9-49d4-9891-2259720f4eba.png)

### 速報資訊
- 紅色部分顯示 `第幾報`
- `最大預估` 為此地震 `全台灣` `最大震度預估值`
- `即時震度` 為 TREM 所有全部 `即時測站` 測得最大震度值

![IMG_20220618_180920](https://user-images.githubusercontent.com/44525760/174438300-174f9a7d-7b56-4c34-a8fb-e8f7b1b3b4e2.png)

### 功能區塊
- `設定` 功能入口
- 顯示時間 `30s和伺服器同步一次` 若時間為紅色 則表示與伺服器斷開連接

![IMG_20220618_180935](https://user-images.githubusercontent.com/44525760/174438493-ec568c99-98cf-4cce-a12a-86bb8a4768cc.png)

### 即時資訊
- 上方色塊為 TREM 所有全部 `即時測站` 震度不為 0 或 超時 的 `即時震度排行`
- 下方為 自選任意觀測點 可在設定中自定義

![IMG_20220618_181013](https://user-images.githubusercontent.com/44525760/174438591-c8a775d6-be4e-4ffc-88d2-b2a1c70a9d1a.png)

### 地圖
- 紅圈 為 `S波`
- 藍圈 為 `P波`
- 點 為 `即時測站`
- 方框 為 該地區有 即時測站 被觸發

![IMG_20220618_181027](https://user-images.githubusercontent.com/44525760/174438785-eb559fb1-ff58-4098-a489-837f512b3bda.png)

### 震度圖
- 用色塊表示此次地震對 `台灣` 的影響

![IMG_20220618_181043](https://user-images.githubusercontent.com/44525760/174438872-27d2af5d-801b-4daa-adc5-ec1bd67317d9.png)

### 地震報告
- 顯示已發生的 `地震資訊`

![IMG_20220618_181102](https://user-images.githubusercontent.com/44525760/174438908-38935c48-439e-4236-a632-4497eebdba81.png)

### 震波資訊
- 顯示 `P波 S波` 抵達時間

![IMG_20220618_181116](https://user-images.githubusercontent.com/44525760/174438933-23519fbb-b71b-4c17-85f7-b001ab6c4419.png)

### 即時測站
- 設備: Esp32
- 傳感器: MPU6050
- 注意: 受噪聲影響 PGA>3.5 才視為一級地震

## 發行
- [Windows](https://github.com/ExpTechTW/TREM/releases)

## 貢獻者
- 請見程式內 `設定` >> `關於` 頁面

------

## 發佈規則
- 如果新版本中有錯誤，且尚未列出，請將錯誤資訊提交到 ```issue```
- 如果您使用任何形式的辱罵性或貶義性語言給其他用戶，您將永遠被封禁！
- 不要發送重複無意義內容至 ```issue```，否則您將永遠被封禁！
- 若有任何問題或建議，歡迎提出

## 合作
- 若有任何可以改進的地方，歡迎使用 ```Pull requests``` 來提交
