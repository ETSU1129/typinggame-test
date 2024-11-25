import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
import GUI from 'lil-gui';
import { gsap } from 'gsap'; 

// gui
const gui = new GUI();

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// scene
const scene = new THREE.Scene();

// グラデーション用のCanvasを作成
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;

const context = canvas.getContext('2d');

// グラデーションの設定（上が青、下が白）
const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#87CEEB');  // 空色
gradient.addColorStop(1, '#FFC0CB');  // pink
// グラデーションをCanvasに描画
context.fillStyle = gradient;
context.fillRect(0, 0, canvas.width, canvas.height);

// CanvasをThree.jsのテクスチャとして使用
const texture = new THREE.CanvasTexture(canvas);
scene.background = texture;

// camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4.33,6.68,8.92);
// カメラの回転をオイラー角で指定する（ラジアン）
camera.rotation.set(0.131, 0.56, -0.07);



// camera.rotation.x = -0.17; // X軸回りに45度回転
// camera.rotation.y = 0.69; // Y軸回りに30度回転
// camera.rotation.z = 0.1           // Z軸は回転なし

scene.add(camera);


function introAnimation() {

    document.getElementById('start').style.display = 'none'

    gsap.to(camera.position, 
        { // カメラの位置から
        duration: 1.5, // アニメーションにかかる時間A
        x:4.84, // 目指すx位置
        y: 1.64, // 目指すy位置q
        z: 6.06, // 目指すz位置
        ease: "power4.inOut", // イージングを定義
        onComplete: function () { // アニメーション終了時
        }
    }
    )
    gsap.to(camera.rotation,
        {
            duration: 3.5,
            delay: 0.5,
            x: -0.17,
            y: 0.36,
            z: -0.1,
            ease: "power4.inOut"
        }
    )
    
}

document.getElementById('start').addEventListener('click', () => {
    introAnimation()
})



// マウスの座標を保存する変数（初期化）
let mouseX = 0;
let mouseY = 0;

// カメラの初期回転を保存
const initialCameraRotationX = camera.rotation.x;
const initialCameraRotationY = camera.rotation.y;

// マウスが動いたときのイベントリスナーを追加
window.addEventListener('mousemove', (event) => {
    // 画面の中心を基準に -1 から 1 の範囲に正規化
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

// カメラに揺れを追加する強度
const movementIntensity = 0.03; // 値が大きいほどカメラの動きが強くなる




const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'x', -10, 10).name('Position X');
cameraFolder.add(camera.position, 'y', -10, 10).name('Position Y');
cameraFolder.add(camera.position, 'z', -10, 10).name('Position Z');
cameraFolder.add(camera.rotation, 'x', -Math.PI, Math.PI).name('Rotation X');
cameraFolder.add(camera.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y');
cameraFolder.add(camera.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z');
cameraFolder.open();


// renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('canvas.webgl'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// OrbitControls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;


// lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// fog
const fog = new THREE.Fog('#87CEEB', -15, 100);
scene.fog = fog;

// フォントローダー
const fontLoader = new FontLoader();
let cachedFont = null; // キャッシュされたフォント

// フォントを事前にロードしてキャッシュ
function preloadFont() {
    return new Promise((resolve) => {
        if (cachedFont) {
            // すでにキャッシュされている場合はそれを返す
            resolve(cachedFont);
        } else {
            fontLoader.load('./Oswald Medium_Regular.json', (loadedFont) => {
                cachedFont = loadedFont;
                resolve(cachedFont);
            });
        }
    });
}





// 物理ワールド (Cannon.js)
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // 重力を設定

// でばっかー
const cannonDebugger = new CannonDebugger(scene, world);

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
const bakedTexture = textureLoader.load('bake_01.jpg')
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

const bakedTexture2 = textureLoader.load('bake_02.jpg')
bakedTexture2.flipY = false
bakedTexture2.colorSpace = THREE.SRGBColorSpace

/**
 * Materials
 */
// Baked material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const bakedMaterial2 = new THREE.MeshBasicMaterial({ map: bakedTexture2 })

/**
 * Model
 */
gltfLoader.load(
    'typing_map.glb',
    (gltf) =>
    {
        const bakedMesh = gltf.scene.children.find(child => child.name === 'bake_001')
        const bakedMesh2 = gltf.scene.children.find(child => child.name === 'bake_002')

        bakedMesh.material = bakedMaterial
        bakedMesh2.material = bakedMaterial2

        scene.add(gltf.scene)
        gltf.scene.scale.set(0.1, 0.1, 0.1)
        gltf.scene.position.set(0, -0.327, 0)
        //lil-guiにｙ座標を追加フォルダー付き
        const gltf_positionFolder = gui.addFolder('gltf_position')
        gltf_positionFolder.add(gltf.scene.position, 'y').min(-1).max(1).step(0.001).name('y')
    }
)

// 地面の物理ボディ (Cannon.js)
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 }); // 質量が0のため固定
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // 地面を水平に設定
world.addBody(groundBody);

const words = [
    "kouinyanogotoshi", 
    "sarumokikaraochiru", 
    "inumiarukebabouniataru", 
    "isogabamawe", 
    "hanayoridango", 
    "iwanugahana", 
    "juunintoiro", 
    "tonarinonoshibafuaaoi", 
    "kintetsuwasennennouchi", 
    "ryouyakuwakuchininigashi", 
    "mizuninagasu", 
    "nezuminoichimai", 
    "ookiikotowaikoto", 
    "mewakuchihodonimonoiu", 
    "ushinomimininembutsu", 
    "nitowouwamonowaittomoiezu", 
    "derukugiwautareru", 
    "kourogiwanakugayukiwafurazu", 
    "niwatorinotamenimizuokiku", 
    "yattamonkachi"
];
const wordsInJapanese = [
    "光陰矢の如し", 
    "猿も木から落ちる", 
    "犬も歩けば棒に当たる", 
    "急がば回れ", 
    "花より団子", 
    "言わぬが花", 
    "十人十色", 
    "隣の芝生は青い", 
    "金鉄は千年の内", 
    "良薬は口に苦し", 
    "水に流す", 
    "鼠の一枚", 
    "大きいことはいいこと", 
    "目は口ほどに物を言う", 
    "牛の耳に念仏", 
    "二兎を追う者は一兎も得ず", 
    "出る釘は打たれる", 
    "蟋蟀は鳴くが雪は降らず", 
    "鶏のために水を聞く", 
    "やった者勝ち"
];

// DOM要素に現在の単語を表示する要素を追加
const wordDisplay = document.createElement('div');
wordDisplay.style.position = 'absolute';
wordDisplay.style.top = '10px';
wordDisplay.style.left = '800px';
wordDisplay.style.fontSize = '24px';
wordDisplay.style.fontFamily = 'Arial, sans-serif';
document.body.appendChild(wordDisplay);

// 現在のターゲットワードとその進捗を保持する変数
let currentWord = '';
let currentWordInJapanese = '';
let currentLetterIndex = 0; // 現在の文字インデックス

// 3Dテキスト生成関数
async function createTextMesh(letter, index) {
    if (!cachedFont) {
        // フォントがキャッシュされていない場合はプリロードする
        await preloadFont();
    }

    const textGeometry = new TextGeometry(letter, {
        font: cachedFont,  // キャッシュされたフォントを使用
        size: 1,
        depth: 0.2,
        curveSegments: 12,
    });

    textGeometry.center();
    textGeometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const letterMesh = new THREE.Mesh(textGeometry, material);

    //文字を出現させる位置をランダムに設定
    const yPosition = 10;
    const xPosition = (Math.random() - 0.5) * 2.5;
    const zPosition = (Math.random() - 0.5) * 2.5;

    letterMesh.position.set(xPosition, yPosition, zPosition);
    scene.add(letterMesh);

    const bbox = textGeometry.boundingBox;
    const sizeX = (bbox.max.x - bbox.min.x) / 2;
    const sizeY = (bbox.max.y - bbox.min.y) / 2;
    const sizeZ = (bbox.max.z - bbox.min.z) / 2;

    const letterShape = new CANNON.Box(new CANNON.Vec3(sizeX, sizeY, sizeZ));
    const letterBody = new CANNON.Body({ mass: 1 });
    letterBody.addShape(letterShape);
    letterBody.position.set(xPosition, yPosition, zPosition);

    // 物理ボディとメッシュを紐付け
    letterMesh.userData.physicsBody = letterBody;
    world.addBody(letterBody);
}

// 現在の単語をHTMLに表示
function updateWordDisplay() {
    const typedPart = currentWord.slice(0, currentLetterIndex); // 打った部分
    const remainingPart = currentWord.slice(currentLetterIndex); // 残りの部分
    wordDisplay.innerHTML = `
        <div>Type: <span style="color: green">${typedPart}</span><span style="color: red">${remainingPart}</span></div>
        <div>(${currentWordInJapanese})</div>`;
}

// タイピングされた文字が正しいかを判定し、正しい場合はその文字を表示して落下させる
async function checkLetter(input) {
    const expectedLetter = currentWord[currentLetterIndex];
    if (input === expectedLetter) {

        // 正しい文字が入力された場合、その文字を表示し、物理エンジンで落下
        await createTextMesh(expectedLetter, currentLetterIndex);
        currentLetterIndex++;

        // 進捗が完了したら次の単語へ
        if (currentLetterIndex >= currentWord.length) {
            currentWord = '';
            currentWordInJapanese = '';
            currentLetterIndex = 0;
            setRandomWord(); // 新しい単語を表示
        }

        updateWordDisplay(); // 画面に進捗を反映
    }
}

// ランダムな単語を選択して表示
function setRandomWord() {
    const randomIndex = Math.floor(Math.random() * words.length);
    currentWord = words[randomIndex];
    currentWordInJapanese = wordsInJapanese[randomIndex]; // 日本語も同じインデックスから取得
    currentLetterIndex = 0;
    updateWordDisplay();
}

// 初期化：最初の単語を設定
preloadFont().then(() => {
    setRandomWord();
});

// キーボード入力イベント
window.addEventListener('keydown', (event) => {
    checkLetter(event.key); // 1文字ごとに入力をチェック
});


// フォントが正しくロードされた後に TextGeometry を作成するようにする
preloadFont().then(() => {
    // 新しいテキストジオメトリを作成
    const introtext = new TextGeometry('typing tawar', {
        font: cachedFont,  // キャッシュされたフォントを使用
        size: 1,
        depth: 0.2,
        curveSegments: 12,
    });

    const introtextMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    const introtextMesh = new THREE.Mesh(introtext, introtextMaterial);
    introtextMesh.position.set(-2.5, 8.0, 8.2);
    introtextMesh.rotation.set(-0.025, 1.22, 0.13);
    scene.add(introtextMesh);
    const gui_positionFolder = gui.addFolder('introtext_position')
    gui_positionFolder.add(introtextMesh.position, 'x').min(-10).max(10).step(0.001).name('x')
    gui_positionFolder.add(introtextMesh.position, 'y').min(-10).max(10).step(0.001).name('y')
    gui_positionFolder.add(introtextMesh.position, 'z').min(-10).max(10).step(0.001).name('z')
    gui_positionFolder.open();
    const gui_rotationFolder = gui.addFolder('introtext_rotation')
    gui_rotationFolder.add(introtextMesh.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.001).name('x')
    gui_rotationFolder.add(introtextMesh.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.001).name('y')
    gui_rotationFolder.add(introtextMesh.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.001).name('z')
    gui_rotationFolder.open();
});


// アニメーションループ
const clock = new THREE.Clock();
const animate = () => {
    const deltaTime = clock.getDelta();

    // 物理エンジンのステップ
    world.step(1 / 60, deltaTime, 3);



    // カメラの回転にマウスの位置を反映（初期回転を基準に調整）
    camera.rotation.x = initialCameraRotationX + (-mouseY * movementIntensity);
    camera.rotation.y = initialCameraRotationY + (mouseX * movementIntensity);

    // Cannon.jsの物理ボディをデバッグ描画
    cannonDebugger.update();

    // Three.jsのオブジェクトの位置をCannon.jsの物理ボディの位置に同期
    scene.traverse(obj => {
        if (obj.userData.physicsBody) {
            obj.position.copy(obj.userData.physicsBody.position);
            obj.quaternion.copy(obj.userData.physicsBody.quaternion);
        }
    });

    // カメラとレンダリングの更新
    // controls.update();
    renderer.render(scene, camera);
    // console.log(camera.position)
    // console.log(camera.rotation)
    // FPSの計測
    stats.update();

    requestAnimationFrame(animate);
};

animate();


console.log(camera.position)
console.log(camera.rotation)