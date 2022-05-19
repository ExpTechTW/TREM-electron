ImageGET()
let Old = null
setInterval(async () => {
    ImageGET()
}, 60 * 1000)
function ImageGET() {
    let data = {
        "APIkey": "a5ef9cb2cf9b0c86b6ba71d0fc39e329",
        "Function": "data",
        "Type": "radar",
        "FormatVersion": 1
    }
    axios.post('http://150.117.110.118:10150', data)
        .then(function (response) {
            var img = document.getElementById("radar")
            img.src = "data:image/png;base64," + response.data["response"]
            img.height = 500
            img.width = 500
        })
        .catch(function (error) {
            console.log(error)
        })
}