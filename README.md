> **Warning**  
> 目前的版本由於 API 變動，TREM 中的某些功能可能無法按預期運作。  
> 目前正在進行全面重寫，發布日期尚未確定。如需更多資訊，請參閱 [`rewrite`](https://github.com/ExpTechTW/TREM/tree/rewrite) 分支。  
> As a result of recent API changes, certain functionalities in TREM may not operate as intended.  
> A full rewrite is presently underway, with the release date yet to be determined. For further information, please refer to [`rewrite`](https://github.com/ExpTechTW/TREM/tree/rewrite) branch.

<img alt="Logo" src="https://upload.cc/i1/2022/08/11/DOqzZM.png" width="128px" height="128px" align="left"/>

# Taiwan Real-time Earthquake Monitoring
臺灣即時地震監測
<a href="https://github.com/ExpTechTW/TREM/actions/workflows/github_actions.yml"><img alt="GitHub Workflow Status" align="right" src="https://github.com/ExpTechTW/TREM/actions/workflows/github_actions.yml/badge.svg"></a>
<a href="https://discord.gg/5dbHqV8ees"><img alt="TREM Discord" align="right" src="https://img.shields.io/discord/926545182407688273?color=%237289DA&logo=discord&logoColor=white"></a>\
&nbsp;

<div style="display: grid; grid-template-columns: 1fr 1fr;">
<img alt="即時測站" title="即時測站" src="https://user-images.githubusercontent.com/58339640/202887682-1a93b021-bcb2-44e4-b3f2-f2897ad2c4db.png" style="width: 49%; height: auto;" />
<img alt="地震速報" title="地震速報" src="https://user-images.githubusercontent.com/58339640/202887698-36edd8ad-507e-466d-b81c-1823603bc1f9.png" style="width: 49%; height: auto;" />
<img alt="P-Alert" title="P-Alert" src="https://user-images.githubusercontent.com/58339640/202888023-09a9db49-bc0d-405f-a144-5aa28e8c729d.png" style="width: 49%; height: auto;" />
<img alt="地震報告" title="地震報告" src="https://user-images.githubusercontent.com/58339640/202887652-6c691e34-8ba2-4e2b-91e5-a72cf75e39da.png" style="width: 49%; height: auto;" />
</div>
即時測站效果 https://youtu.be/gcaStCv-be8

## 關於 TREM

TREM 是一款開源地震速報軟體，提供給您即時的地震資訊，利用自製的測站，顯示各地的即時震度，在地震發生的第一時間取得各管道發布的強震即時警報訊息
 
## 功能
* 即時地震資訊
* 查看地震報告
* 地震預警
* 各地即時震度
* 接收其他國家的地震速報
* 使用 Webhook 將地震資訊連結到 Discord 伺服器裡
* 自訂義主題顏色

## 安裝
### 官方 | 官方推出的版本 較為穩定
#### Windows
到我們的 [Release](https://github.com/ExpTechTW/TREM/releases/latest) 頁面下載 TREM.Setup\
下載完成後執行，就會開始安裝，安裝完成後會自動開啟 TREM

#### MacOS
目前還沒有提供 MacOS 支援，敬請期待 :3

### 社區 | 由開源社區維護的版本 適合嘗鮮
- [yayacat](https://github.com/yayacat/TREM/releases)

## 文檔
* [TREM](https://hackmd.io/@n5w-HNYMQUmvhV6t1kor5g/Bkqtwduo9)
* [TREM TAS](https://hackmd.io/@n5w-HNYMQUmvhV6t1kor5g/r1egEt_s5)

## 強震即時警報來源
* [交通部中央氣象局](https://www.cwb.gov.tw/)
* [P波警報器強震網](https://palert.earth.sinica.edu.tw/)
* [中国福建省地震局](http://www.fjdzj.gov.cn)
* [日本気象庁](https://www.jma.go.jp/)
* [防災科研](https://www.bosai.go.jp/)

## 注意事項
1. 使用過程中，請務必謹慎閱讀提示和注意事項
2. 使用過程中可能遇到無法理解的錯誤，但大部份不影響系統運作，如遇到錯誤請向開發人員回報
3. 即時測站資訊僅供參考，實際請以中央氣象局為主
4. 此軟體僅供研究、學術及教育用途（不得營利），若使用則需接受相關風險
5. 任何不被官方所認可的行為均有可能被列入伺服器黑名單中，請務必遵守相關規範
6. 此程式為免費開源程式，不保證能永久營運
7. 最後，如果覺得程式不錯，請分享給其他人，這是讓作者維護下去的動力
8. 我們不斷對程式進行更新及優化，我們一直和使用者站在一起，為使用者的體驗而不斷努力
9. 本程式內資源均由網際網路收集而來， 當權利人發現在本程式所提供的內容侵犯其著作權時，**請聯繫我們並請權利人提供相關文件連結**， 本站將依法採取措施移除相關內容或斷開相關鏈接

## 貢獻者
- whes1015 `程式開發` `文檔`
- Kamiya `介面設計` `程式開發` `日文翻譯` `英文翻譯`
- Yowoapple `俄文翻譯`
- NYJ36 `韓文翻譯`
- PGpenguin72 `簡體中文翻譯`
- yayacat `簡體中文翻譯` `社區`
- eggrollpvp `資料處理` `文檔`
- M789 `圖形設計`
- JQuake `音效`
- 地牛Wake Up! `音效`
- pisces_ `設備提供`

## 如何貢獻
點擊 [Repo](https://github.com/ExpTechTW/TREM) 主頁右上角的 Code 按鈕後點擊 Download ZIP 來下載原始碼壓縮檔\
或是使用 `git clone` 指令來複製一份原始碼到你的電腦上\
修改變更後開啟 [Pull Request](https://github.com/ExpTechTW/TREM/pulls) 來把你的變更合併到我們下一次的更新裡面 :D

## 合作
- [ExpTech Studio](https://www.youtube.com/embed/live_stream?channel=UCkCzTx8RfC-Chd_hY01R80Q) `YouTube 直播 (24小時)`
- [布丁Timyaya 地震記錄](https://www.youtube.com/channel/UCJUeRIt6jKSE-4jP7QB70kw) `YouTube 錄播`
- [TEEWLAB速報實驗室](https://www.youtube.com/embed/live_stream?channel=UC9ssJN3nzsA83ZOBiRNDABg) `YouTube 直播 (24小時)`
- [Yoyo0901](https://www.youtube.com/embed/live_stream?channel=UCE74C-snUczeXrfOYp4hYQQ) `YouTube 直播 (24小時)`

## 開源許可證
開源許可證資訊請詳見 [LICENSE](LICENSE) 檔案
