import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import  Stats from 'stats.js';

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// シーン設定
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// カメラ設定
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
scene.add(camera);

// レンダラー設定
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('canvas.webgl'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// OrbitControls設定
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// フォントローダー
const fontLoader = new FontLoader();
let font; // ロードしたフォントを保持する変数

// 物理ワールド (Cannon.js)
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // 重力を設定 (ちなみにy軸に９．８２m/s^2地球上である)

//でばっかー
const cannonDebugger = new CannonDebugger(scene, world);

// 地面の物理ボディ (Cannon.js)
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 }); // 質量が0のため固定
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // 地面を水平に設定
world.addBody(groundBody);

// 地面のメッシュ (Three.js)
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2; // 地面を水平に設定
scene.add(groundMesh);

// 単語の配列
const words = ["aaaa", "bbbb", "cccc", "abcd"];

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
let currentLetterIndex = 0; // 現在の文字インデックス

// 3Dテキスト生成関数（フォントのロードを待ってからメッシュと物理ボディを生成）
async function createTextMesh(letter, index) {
    if (!font) { // フォントがまだロードされていない場合は待つ
        await new Promise(resolve => {
            fontLoader.load('./public/Oswald_Regular.json', (loadedFont) => {
                font = loadedFont;
                resolve();
            });
        });
    }

    const textGeometry = new TextGeometry(letter, {
        font: font,
        size: 1,
        depth: 0.5,
        curveSegments: 12,
    });

    textGeometry.center();
    textGeometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const letterMesh = new THREE.Mesh(textGeometry, material);

    const yPosition = 10;
    const xPosition = (Math.random() - 0.5) * 50;
    const zPosition = (Math.random() - 0.5) * 50;

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
    wordDisplay.innerHTML = `Type: <span style="color: green">${typedPart}</span><span style="color: red">${remainingPart}</span>`;
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
            currentLetterIndex = 0;
            setRandomWord(); // 新しい単語を表示
        }

        updateWordDisplay(); // 画面に進捗を反映
    }
}

// ランダムな単語を選択して表示
function setRandomWord() {
    currentWord = words[Math.floor(Math.random() * words.length)];
    currentLetterIndex = 0;
    updateWordDisplay();
}

// 初期化：最初の単語を設定
setRandomWord();

// キーボード入力イベント
window.addEventListener('keydown', (event) => {
    checkLetter(event.key); // 1文字ごとに入力をチェック
});

// アニメーションループ
const clock = new THREE.Clock();
const animate = () => {
    const deltaTime = clock.getDelta();

    // 物理エンジンのステップ
    world.step(1 / 60, deltaTime, 3);

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
    controls.update();
    renderer.render(scene, camera);

    // FPSの計測
    stats.update();

    requestAnimationFrame(animate);
};

animate();