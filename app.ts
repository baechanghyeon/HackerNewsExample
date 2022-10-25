interface Store {
  currentPage: number;
  feeds: NewsFeed[];
}

interface News {
  readonly id: number;
  readonly time_ago: string;
  readonly title: string;
  readonly url: string;
  readonly user: string;
  readonly content: string;
}

interface NewsFeed extends News {
  readonly comments_count: number;
  readonly points: number;
  read?: boolean; // optional
}

interface NewsDetail extends News {
  readonly comments: NewsComment[];
}

interface NewsComment extends News {
  readonly comments: NewsComment[];
  readonly level: number;
}

const container: HTMLElement | null = document.getElementById("root");
const NEWS_URL = "https://api.hnpwa.com/v0/news/1.json";
const CONTENT_URL = "https://api.hnpwa.com/v0/item/@id.json";

// 중복된 코드를 줄이고 함수를 만들어 후에 변경과 추적이 쉽도록 코드를 작성할 수 있도록 하자.

// currentPage 전역 변수로 설정하여 돌아가기 누를 시 해당 페이지로 이동
// feeds를 배열로 선언, 여러번의 getData함수 호출을 회피하기 위해 배열 변수를 선언하여 저장

const store: Store = {
  currentPage: 1,
  feeds: [],
};

// Mixin => 상속을 유연하게 받기 위해 사용
// Typescript 공식 문서 참고
function applyApiMixins(targetClass: any, baseClasses: any[]): void {
  baseClasses.forEach((baseClass) => {
    Object.getOwnPropertyNames(baseClass.prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        baseClass.prototype,
        name
      );

      if (descriptor) {
        Object.defineProperty(targetClass.prototype, name, descriptor);
      }
    });
  });
}

class Api {
  url: string;
  ajax: XMLHttpRequest;

  constructor(url: string) {
    this.url = url;
    this.ajax = new XMLHttpRequest();
  }

  getRequest<AjaxResponse>(): AjaxResponse {
    this.ajax.open("GET", this.url, false);
    this.ajax.send();

    return JSON.parse(this.ajax.response);
  }
}

class NewsFeedApi extends Api {
  getData(): NewsFeed[] {
    return this.getRequest<NewsFeed[]>();
  }
}

class NewsDetailApi extends Api {
  getData(): NewsDetail {
    return this.getRequest<NewsDetail>();
  }
}

// // 합성한다는 것을 알려준다.
// interface NewsFeedApi extends Api {}
// interface NewsDetailApi extends Api {}

// applyApiMixins(NewsFeedApi, [Api]);
// applyApiMixins(NewsDetailApi, [Api]);

// URL data 불러오기
// function getData<AjaxResponse>(url: string): AjaxResponse {
//   ajax.open("GET", url, false);
//   ajax.send();

//   return JSON.parse(ajax.response);
// }

// 읽은 글은 표시해주기  white => yellow
// 글 목록 전체 읽음 처리 다 false 로 초기화 시켜주기
function makeFeeds(feeds: NewsFeed[]): NewsFeed[] {
  for (let i = 0; i < feeds.length; i++) {
    feeds[i].read = false;
  }
  return feeds;
}

function updateView(html: string): void {
  if (container) {
    container.innerHTML = html;
  } else {
    console.error("최상위 컨테이너가 없어 UI를 진행하지 못합니다.");
  }
}
// 글 목록 함수
function newsFeed(): void {
  const api = new NewsFeedApi(NEWS_URL);

  let newsFeed: NewsFeed[] = store.feeds;
  const newsList = [];
  // template 변수를 선언하여 눈으로 식별하기 쉽도록 html 형식으로 구현 및 값을 전달하여 container에 저장하여 화면에 띄우기
  let template = `
  <div class="bg-gray-600 min-h-screen">
  <div class="bg-white text-xl">
    <div class="mx-auto px-4">
      <div class="flex justify-between items-center py-6">
        <div class="flex justify-start">
          <h1 class="font-extrabold">Hacker News</h1>
        </div>
        <div class="items-center justify-end">
          <a href="#/page/{{__prev_page__}}" class="text-gray-500">
            Previous
          </a>
          <a href="#/page/{{__next_page__}}" class="text-gray-500 ml-4">
            Next
          </a>
        </div>
      </div> 
    </div>
  </div>
  <div class="p-4 text-2xl text-gray-700">
    {{__news_feed__}}        
  </div>
</div>
  `;
  // getData를 한번만 호출하여 불필요한 데이터 통신 줄이기
  if (newsFeed.length === 0) {
    newsFeed = store.feeds = makeFeeds(api.getData());
  }

  // 페이지 네이션
  for (let i = store.currentPage - 1; i < store.currentPage * 10; i++) {
    newsList.push(
      `    
      <div class="p-6 ${
        newsFeed[i].read ? "bg-yellow-500" : "bg-white"
      } mt-6 rounded-lg shadow-md transition-colors duration-500 hover:bg-green-100">
      <div class="flex">
        <div class="flex-auto">
          <a href="#/show/${newsFeed[i].id}">${newsFeed[i].title}</a>  
        </div>
        <div class="text-center text-sm">
          <div class="w-10 text-white bg-green-300 rounded-lg px-0 py-2">${
            newsFeed[i].comments_count
          }</div>
        </div>
      </div>
      <div class="flex mt-3">
        <div class="grid grid-cols-3 text-sm text-gray-500">
          <div><i class="fas fa-user mr-1"></i>${newsFeed[i].user}</div>
          <div><i class="fas fa-heart mr-1"></i>${newsFeed[i].points}</div>
          <div><i class="far fa-clock mr-1"></i>${newsFeed[i].time_ago}</div>
        </div>  
      </div>
    </div>    
  `
    );
  }

  // replace 함수를 통해 값이 들어가는 부분을 바꿔준다.
  // 이런식의 코드 구현은 자칫 코드양이 늘어남에 따라 코드가 복잡해보이는 단점이 존재한다.
  template = template.replace("{{__news_feed__}}", newsList.join(""));

  // if 조건절을 사용하기 부담스러울 때는 삼항연산자를 활용하여 간단하게 조건절을 줄 것
  template = template.replace(
    "{{__prev_page__}}",
    String(store.currentPage > 1 ? store.currentPage - 1 : 1)
  );

  template = template.replace(
    "{{__next_page__}}",
    String(store.currentPage < 3 ? store.currentPage + 1 : 3)
  );

  updateView(template);
}

// 글 세부 내용
function newsDetail(): void {
  const id = location.hash.substr(7);
  const api = new NewsDetailApi(CONTENT_URL.replace("@id", id));
  const newsContent = api.getData();
  let template = `
  <div class="bg-gray-600 min-h-screen pb-8">
  <div class="bg-white text-xl">
    <div class="mx-auto px-4">
      <div class="flex justify-between items-center py-6">
        <div class="flex justify-start">
          <h1 class="font-extrabold">Hacker News</h1>
        </div>
        <div class="items-center justify-end">
          <a href="#/page/${store.currentPage}" class="text-gray-500">
            <i class="fa fa-times"></i>
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="h-full border rounded-xl bg-white m-6 p-4 ">
    <h2>${newsContent.title}</h2>
    <div class="text-gray-400 h-20">
      ${newsContent.content}
    </div>

    {{__comments__}}

  </div>
</div>
    `;

  // id 값은 string 이기 때문에 Number로 형 변환
  for (let i = 0; i < store.feeds.length; i++) {
    // 들어가는 글의 read 변수의 boolean 값을 true로 변환하여 '읽음' 표시
    if (store.feeds[i].id === Number(id)) {
      store.feeds[i].read = true;
      // 조건값을 만족하고 변수 값을 초기화 후에 break 문으로 해당 조건절을 빠져나온다.
      break;
    }
  }
  updateView(
    template.replace("{{__comments__}}", makeComment(newsContent.comments))
  );
}

// 재귀 호출을 통해 대댓글 보여주기
// called props는 대댓글의 depth를 의미한다.
function makeComment(comments: NewsComment[]): string {
  const commentString = [];

  for (let i = 0; i < comments.length; i++) {
    // 중복 방지
    const comment: NewsComment = comments[i];

    commentString.push(`
          <div style="padding-left: ${comment.level * 40}px;" class="mt-4">
            <div class="text-gray-400">
              <i class="fa fa-sort-up mr-2"></i>
              <strong>${comment.user}</strong> ${comment.time_ago}
            </div>
            <p class="text-gray-700">${comment.content}</p>
          </div>      
        `);

    // 댓글 밑에 대댓글이 존재하면 만족하는 조건절
    if (comments[i].comments.length > 0) {
      commentString.push(makeComment(comment.comments));
    }
  }

  return commentString.join("");
}

// 화면 전환 router
function router(): void {
  const routePath = location.hash;
  // router에서 # 은 빈값으로 인식하기 때문에 # 뒤에 값이 없을 시 "" 빈 값을 반환한다.
  if (routePath === "") {
    newsFeed();
  } else if (routePath.indexOf("#/page/") >= 0) {
    // #/page/@@ => currentPage 값을 @@ 값으로 초기화한다.
    store.currentPage = Number(routePath.substr(7));
    newsFeed();
  } else {
    // 글 상세는 #/show/
    newsDetail();
  }
}

// hashchange Event가 생길 시 router 함수를 호출
window.addEventListener("hashchange", router);

// 최초 1회 router 함수 호출
router();
