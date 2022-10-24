console.log("start");
let ajax = new XMLHttpRequest();

ajax.open("GET", "https://api.hnpwa.com/v0/news/1.json", false);
ajax.send();

const newsFeed = JSON.parse(ajax.response);
const ul = document.createElement("ul");

for (let i = 0; i < 10; i++) {
  const li = document.createElement("li");
  li.innerHTML = newsFeed[i].title;
  ul.appendChild(li);
}

document.getElementById("root").appendChild(ul);
