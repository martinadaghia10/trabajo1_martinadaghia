Ammo().then(function (Ammo) {

    // Detects webgl
    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        document.getElementById('container').innerHTML = "";
    }

    // Global variables 
    var container;
    var camera, controls, scene, renderer;
    var textureLoader;
    var ground;
    var clock = new THREE.Clock();
    var clickRequest = false;
    var mouseCoords = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var ballMaterial;
    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();
    var fallenCubes = [];
    var object1, object2, object3, object4, object5, object6, object7, object8, object9;
    var timerStart; // x memorizzare quando il timer è stato avviato
    var timerRunning = false; // se il timer è in esecuzione o no
    var elapsedBeforeLaunch = 0; // x memorizzare il tempo trascorso prima del lancio della palla
    var score = 0;
    var maxScore = 0;
    var level2, verificato, blocca, clickOnGUI = false;
    var isSecondLevelTriggered = false; // se if è già stato eseguito
    var ballsLaunched = 0; // palle lanciate
    var ballsLimit = 0; // palle disponibili
    var pointLight;
    var gravityConstant = -9.8;
    var collisionConfiguration;
    var dispatcher;
    var broadphase;
    var solver;
    var physicsWorld;
    var rigidBodies = [];
    var softBodies = [];
    var margin = 0.05;
    var transformAux1 = new Ammo.btTransform();
    var guiControls;
    var gui;

    init();
    setupGUI();
    animate();

    function init() {
        document.getElementById("scoreValue").innerHTML = score;

        initGraphics();

        initPhysics();

        if (!JSON.parse(localStorage.getItem("Secondo livello"))) { //"Secondo livello" = false --> gioco al primo livello
            //console.log("2° livello = " + localStorage.getItem("Secondo livello") + " --> siamo al 1° livello");
            document.getElementById("level").innerHTML = "First level";
            createObjects(); //per il primo livello
        } else { //"Secondo livello" = true --> gioco al secondo livello
            //console.log("2° livello = " + localStorage.getItem("Secondo livello") + " --> siamo al 2° livello");
            document.getElementById("level").innerHTML = "Second level";
            createObjects2(); //per il secondo livello
        }

        initInput();

        // Ascolta gli eventi del click del mouse
        document.addEventListener('mousedown', function (event) {
            // Controlla se il click è avvenuto sulla GUI
            if (gui.domElement.parentElement.contains(event.target)) {
                clickOnGUI = true;
            } else {
                clickOnGUI = false;
            }
        });
    }

    function initGraphics() {

        container = document.getElementById('container');
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
        scene = new THREE.Scene();

        camera.position.x = 0;
        camera.position.y = 5;
        camera.position.z = 20;

        controls = new THREE.OrbitControls(camera);
        controls.target.y = 2;

        renderer = new THREE.WebGLRenderer();
        renderer.setClearColor(0xFCE5CD);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true; //ombre abilitate

        textureLoader = new THREE.TextureLoader();

        // luce ambientale
        var ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        //luce direzionale per le ombre
        var light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(-10, 10, 5);
        light.castShadow = true;
        var d = 20;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;

        light.shadow.camera.near = 2;
        light.shadow.camera.far = 50;

        light.shadow.mapSize.x = 1024;
        light.shadow.mapSize.y = 1024;

        scene.add(light);

        // Aggiungi una luce puntiforme
        pointLight = new THREE.PointLight(0xffffff, 0.5);
        camera.add(pointLight); // Aggiungi la luce puntiforme come figlio della telecamera
        scene.add(camera); // Aggiungi la telecamera alla scena

        container.innerHTML = "";
        container.appendChild(renderer.domElement);
        window.addEventListener('resize', onWindowResize, false);
    }

    function initPhysics() {
        // Physics configuration
        collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        broadphase = new Ammo.btDbvtBroadphase();
        solver = new Ammo.btSequentialImpulseConstraintSolver();
        softBodySolver = new Ammo.btDefaultSoftBodySolver();
        physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
        physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
        physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
    }
    /* *************************************************************************************************** */
    /* SOLIDI */
    /* *************************************************************************************************** */
    function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

        var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
        var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
        shape.setMargin(margin);

        createRigidBody(threeObject, shape, mass, pos, quat);

        return threeObject;
    }

    function createCylinder(radiusTop, radiusBottom, height, radialSegments, mass, pos, quat, material) {
        // Crea un cilindro Three.js
        var threeObject = new THREE.Mesh(
            new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
            material
        );

        // Crea la forma del cilindro in Ammo.js
        var shape = new Ammo.btCylinderShape(new Ammo.btVector3(radiusTop, height * 0.5, radiusBottom));
        shape.setMargin(margin);

        // Crea il corpo rigido del cilindro
        createRigidBody(threeObject, shape, mass, pos, quat);

        return threeObject;
    }

    function createCone(radius, height, radialSegments, mass, pos, quat, material) {
        // Crea un cono Three.js
        var threeObject = new THREE.Mesh(
            new THREE.ConeGeometry(radius, height, radialSegments),
            material
        );

        // Crea la forma del cono in Ammo.js
        var shape = new Ammo.btConeShape(radius, height);

        // Crea il corpo rigido del cono
        createRigidBody(threeObject, shape, mass, pos, quat);

        return threeObject;
    }
    /* *************************************************************************************************** */
    function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

        threeObject.position.copy(pos);
        threeObject.quaternion.copy(quat);

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        var motionState = new Ammo.btDefaultMotionState(transform);

        var localInertia = new Ammo.btVector3(0, 0, 0);
        physicsShape.calculateLocalInertia(mass, localInertia);

        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
        var body = new Ammo.btRigidBody(rbInfo);

        threeObject.userData.physicsBody = body;

        scene.add(threeObject);

        if (mass > 0) {
            rigidBodies.push(threeObject);
            // Disable deactivation
            body.setActivationState(4);
        }
        physicsWorld.addRigidBody(body);

        return body;
    }

    function initInput() {

        window.addEventListener('mousedown', function (event) {
            if (!clickRequest) {
                mouseCoords.set(
                    (event.clientX / window.innerWidth) * 2 - 1,
                    - (event.clientY / window.innerHeight) * 2 + 1
                );
                clickRequest = true;
            }
        }, false);

        // Aggiungi un gestore degli eventi per la pressione dei tasti
        window.addEventListener('keydown', function (event) {
            // W per muoversi in avanti
            if (event.key === 'w') {
                // Modifica la posizione della telecamera
                camera.translateZ(-2); // Modifica questa cifra per regolare la velocità del movimento
            }
            // S per muoversi indietro
            else if (event.key === 's') {
                // Modifica la posizione della telecamera
                camera.translateZ(2); // Modifica questa cifra per regolare la velocità del movimento
            }
        });

        // Gestione dell'evento keydown per il movimento a destra e sinistra
        window.addEventListener('keydown', function (event) {
            switch (event.keyCode) {
                case 37: // Freccia sinistra
                    camera.position.x -= 0.5; // Modifica la posizione x della telecamera
                    break;
                case 39: // Freccia destra
                    camera.position.x += 0.5; // Modifica la posizione x della telecamera
                    break;
                case 40: // Freccia giù
                    camera.position.y -= 0.5; // Modifica la posizione y della telecamera
                    break;
                case 38: // Freccia su
                    camera.position.y += 0.5; // Modifica la posizione y della telecamera
                    break;
            }
        }, false);

    }

    function gameOver() {
        // Mostra la finestra modale
        var modalMessage = document.getElementById("modalMessage");
        var modal = document.getElementById("modal");
        modalMessage.innerHTML = "Game Over!<br>";
        modal.style.display = "block";
    }
    /* *************************************************************************************************** */
    /* TIME */
    /* *************************************************************************************************** */
    function startTimer() {
        if (!timerRunning) {
            timerStart = Date.now() - elapsedBeforeLaunch; // Sottrae il tempo trascorso prima del lancio
            timerRunning = true;
            requestAnimationFrame(updateTimer);
        }
    }

    function updateTimer() {
        if (timerRunning) {
            var elapsedTime = Date.now() - timerStart; // Calcola il tempo trascorso
            var seconds = Math.floor(elapsedTime / 1000); // Calcola i secondi

            var minutes = Math.floor(seconds / 60); // Calcola i minuti
            seconds = seconds % 60; // Ottieni il resto dei secondi

            // Formatta il tempo in mm:ss
            var formattedTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

            // Aggiorna il valore del timer nel DOM
            document.getElementById('timerValue').textContent = formattedTime;

            if (minutes >= 1) {
                // Game over, fermare il timer 
                stopTimer();
                minutes = 0;
                seconds = 0;
                var formattedTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
                document.getElementById('timerValue').textContent = formattedTime;
                gameOver();

            } else {
                requestAnimationFrame(updateTimer);
            }
        }
    }

    function stopTimer() {
        timerRunning = false;
        elapsedBeforeLaunch = 0; // Resetta il tempo trascorso prima del lancio della palla
    }
    /* *************************************************************************************************** */
    /* processClick */
    /* *************************************************************************************************** */
    function processClick() {
        if (clickRequest && !clickOnGUI && ballsLaunched < ballsLimit) {

            startTimer(); // Avvia il timer solo se non è già in esecuzione
            elapsedBeforeLaunch = Date.now() - timerStart; // Salva il tempo trascorso prima del lancio
            raycaster.setFromCamera(mouseCoords, camera);

            // Creates a ball
            var ballMass = 0.7;
            var ballRadius = 0.4;
            ballMaterial = new THREE.MeshPhongMaterial({ color: guiControls.ballColor });

            var ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 18, 16), ballMaterial);
            ball.castShadow = true;
            ball.receiveShadow = true;
            var ballShape = new Ammo.btSphereShape(ballRadius);
            ballShape.setMargin(margin);
            pos.copy(raycaster.ray.direction);
            pos.add(raycaster.ray.origin);
            quat.set(0, 0, 0, 1);
            var ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
            ballBody.setFriction(0.5);

            pos.copy(raycaster.ray.direction);
            pos.multiplyScalar(14);
            ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

            clickRequest = false;

            // Aggiorna il numero di palle lanciate
            ballsLaunched++;
            document.getElementById('ballsValue').textContent = ballsLaunched; // Aggiorna il valore del conteggio delle palle lanciate nell'interfaccia
            var ballsAvailable = ballsLimit - ballsLaunched;
            document.getElementById('ballsAvailableValue').textContent = ballsAvailable;

        } else if (blocca && ballsLaunched == ballsLimit && !isSecondLevelTriggered) {
            gameOver();
        } else if (blocca && ballsLaunched == 20 && !isSecondLevelTriggered) {
            gameOver();
        }

    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function setupGUI() {
        // Definizione dei controlli
        guiControls = {
            showTime: true,
            showScore: true,
            showBallsLaunched: true,
            showBallsAvailable: true,
            ballColor: '#000000',
        };

        gui = new dat.GUI();

        // Aggiungi i controlli alla GUI e assegna i listener
        var timeController = gui.add(guiControls, 'showTime').name('Show time');
        var scoreController = gui.add(guiControls, 'showScore').name('Show score');
        var ballsLaunchedController = gui.add(guiControls, 'showBallsLaunched').name('Show balls launched');
        var ballsAvailableController = gui.add(guiControls, 'showBallsAvailable').name('Show balls available');
        var ballColorController = gui.addColor(guiControls, 'ballColor').name('Ball color');

        // Aggiungi listener per rilevare i cambiamenti nei controlli
        timeController.onChange(updateGUIVisibility);
        scoreController.onChange(updateGUIVisibility);
        ballsLaunchedController.onChange(updateGUIVisibility);
        ballsAvailableController.onChange(updateGUIVisibility);
        ballColorController.onChange(updateBallColor);

        var changeTextureButton = {
            'White': function () { updateGroundTexture('../textures/bianco.jpeg'); },
            'Wood': function () { updateGroundTexture('../textures/legno.jpeg'); },
            'Tiles': function () { updateGroundTexture('../textures/piastrelle.jpeg'); },
            'Grass': function () { updateGroundTexture('../textures/prato.jpeg'); },
            'Sea': function () { updateGroundTexture('../textures/mare.jpeg'); },
        };
        gui.add(changeTextureButton, 'White');
        gui.add(changeTextureButton, 'Wood');
        gui.add(changeTextureButton, 'Tiles');
        gui.add(changeTextureButton, 'Grass');
        gui.add(changeTextureButton, 'Sea');

    }

    function updateGroundTexture(textureName) {
        groundTexture = textureName; // aggiorna la variabile globale groundTexture
        textureLoader.load(groundTexture, function (texture) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
            ground.material.map = texture; // nuova texture al pavimento
            ground.material.needsUpdate = true; // aggiorna il materiale del pavimento
        });
    }

    function updateGUIVisibility() {
        // Aggiorna la visibilità degli elementi dell'interfaccia grafica
        document.getElementById('timer').style.display = guiControls.showTime ? 'block' : 'none';
        document.getElementById('score').style.display = guiControls.showScore ? 'block' : 'none';
        document.getElementById('balls').style.display = guiControls.showBallsLaunched ? 'block' : 'none';
        document.getElementById('ballsAvailable').style.display = guiControls.showBallsAvailable ? 'block' : 'none';
    }

    function updateBallColor(color) {
        ballColor = color;
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    function render() {
        var deltaTime = clock.getDelta();
        updatePhysics(deltaTime);
        processClick();
        controls.update(deltaTime);
        // Aggiorna la posizione della luce puntiforme in base alla posizione della telecamera
        pointLight.position.copy(camera.position);
        renderer.render(scene, camera);
    }

    function updatePhysics(deltaTime) {
        // Step world
        physicsWorld.stepSimulation(deltaTime, 10);
        // Update soft volumes
        for (var i = 0, il = softBodies.length; i < il; i++) {
            var volume = softBodies[i];
            var geometry = volume.geometry;
            var softBody = volume.userData.physicsBody;
            var volumePositions = geometry.attributes.position.array;
            var volumeNormals = geometry.attributes.normal.array;
            var numVerts = volumePositions.length / 3;
            var nodes = softBody.get_m_nodes();
            var p = 0;
            for (var j = 0; j < numVerts; j++) {
                var node = nodes.at(j);
                var nodePos = node.get_m_x();
                var nodeNormal = node.get_m_n();

                volumePositions[p] = nodePos.x();
                volumeNormals[p++] = nodeNormal.x();
                volumePositions[p] = nodePos.y();
                volumeNormals[p++] = nodeNormal.y();
                volumePositions[p] = nodePos.z();
                volumeNormals[p++] = nodeNormal.z();
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.normal.needsUpdate = true;
        }

        // Update rigid bodies
        for (var i = 0, il = rigidBodies.length; i < il; i++) {
            var objThree = rigidBodies[i];
            var objPhys = objThree.userData.physicsBody;
            var ms = objPhys.getMotionState();
            if (ms) {
                ms.getWorldTransform(transformAux1);
                var p = transformAux1.getOrigin();
                var q = transformAux1.getRotation();
                objThree.position.set(p.x(), p.y(), p.z());
                objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }

        object1.position.y;
        object2.position.y;
        object3.position.y;

        if (checkFallen(object1)) {
            //console.log("caduto oggetto 1");
            fallenCubes.push(object1);
        } else if (checkFallen(object2)) {
            //console.log("caduto oggetto 2");
            fallenCubes.push(object2);
        } else if (checkFallen(object3)) {
            //console.log("caduto oggetto 3");
            fallenCubes.push(object3);
        }

        if (level2) {
            object4.position.y;
            object5.position.y;
            object6.position.y;
            object7.position.y;
            object8.position.y;
            object9.position.y;

            if (checkFallen(object4)) {
                //console.log("caduto oggetto 4");
                fallenCubes.push(object4);
            } else if (checkFallen(object5)) {
                //console.log("caduto oggetto 5");
                fallenCubes.push(object5);
            } else if (checkFallen(object6)) {
                //console.log("caduto oggetto 6");
                fallenCubes.push(object6);
            } else if (checkFallen(object7)) {
                //console.log("caduto oggetto 7");
                fallenCubes.push(object7);
            } else if (checkFallen(object8)) {
                //console.log("caduto oggetto 8");
                fallenCubes.push(object8);
            } else if (checkFallen(object9)) {
                //console.log("caduto oggetto 9");
                fallenCubes.push(object9);
            }
        }

        //console.log("lungh " + fallenCubes.length);
        // Perform actions based on fallen cubes
        if ((fallenCubes.length == 6 || fallenCubes.length == 18) && verificato && !isSecondLevelTriggered) {
            blocca = true;
            isSecondLevelTriggered = true; // Imposta la variabile a true per indicare che l'if è stato eseguito
            stopTimer();
            secondLevel();
        }

        if (level2 && ballsLaunched >= ballsLimit && fallenCubes.length < maxScore && !isSecondLevelTriggered) {
            gameOver();
        } else if (!level2 && ballsLaunched >= ballsLimit && fallenCubes.length < maxScore && !isSecondLevelTriggered) {
            gameOver();
        }


    }
    /* *************************************************************************************************** */
    function checkFallen(cube) {
        var posY = cube.position.y;

        if ((posY <= 0.5 || posY <= 1.0399) && fallenCubes.indexOf(cube) === -1) { // controlla se il cubo è caduto sotto una certa altezza e se non è già stato aggiunto agli oggetti caduti
            score += 1;
            document.getElementById('scoreValue').textContent = score; // aggiorna lo score nel DOM
            fallenCubes.push(cube); // aggiungo il cubo agli oggetti caduti

            if (score == maxScore) {
                verificato = true;

                // Calculate elapsed time
                var elapsedTime = Date.now() - timerStart;
                var minutes = Math.floor(elapsedTime / 60000); // Convert milliseconds to minutes
                var seconds = Math.floor((elapsedTime % 60000) / 1000); // Convert remaining milliseconds to seconds
                var formattedTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

                // Show modal with victory message
                var modalMessage = document.getElementById("modalMessage");
                modalMessage.innerHTML = "Congratulations, you've won!<br><span class='small-text'><br>You scored: " + score + "<br>Time taken: " + formattedTime + "<br>Number of balls launched: " + ballsLaunched + "</span>";
                var modal = document.getElementById("modal");
                modal.style.display = "block";

                // Nascondi il timer
                document.getElementById('timer').style.display = 'none';
                // Nascondi lo score nell'interfaccia
                document.getElementById('score').style.display = 'none';

                // Hide modal after 30 seconds
                setTimeout(function () {
                    modal.style.display = "none";
                }, 30000); // 30000 milliseconds = 30 seconds
            }
            return true;
        }
        return false;
    }
    /* *************************************************************************************************** */
    function createObjects() {
        maxScore = 3;
        ballsLimit = 4;
        document.getElementById("ballsAvailableValue").innerHTML = ballsLimit;

        // Ground
        pos.set(0, - 0.5, 0);
        quat.set(0, 0, 0, 1);
        ground = createParalellepiped(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF }));
        ground.castShadow = true;
        ground.receiveShadow = true;
        textureLoader.load("../textures/bianco.jpeg", function (texture) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(40, 40);
            ground.material.map = texture;
            ground.material.needsUpdate = true;
        });

        // obstacle
        pos.set(0, 0.5, 0);
        quat.set(0, 0, 0, 1);
        var obstacle = createParalellepiped(6, 1, 1, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0x341C04 }));
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;

        // Creazione del primo oggetto sopra il rettangolo grigio
        pos.set(-2, 1.5, 0); // Imposta la posizione del primo oggetto
        quat.set(0, 0, 0, 1); // Imposta la rotazione del primo oggetto
        object1 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xE06666 })); // Crea il primo oggetto
        object1.castShadow = true;
        object1.receiveShadow = true;

        // Creazione del secondo oggetto sopra il rettangolo grigio
        pos.set(0, 1.5, 0); // Imposta la posizione del secondo oggetto
        object2 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xF6B26B })); // Crea il secondo oggetto
        object2.castShadow = true;
        object2.receiveShadow = true;

        // Creazione del terzo oggetto sopra il rettangolo grigio
        pos.set(2, 1.5, 0); // Imposta la posizione del terzo oggetto
        object3 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFD966 })); // Crea il terzo oggetto
        object3.castShadow = true;
        object3.receiveShadow = true;

    }

    function createObjects2() {
        maxScore = 9;
        level2 = true;
        ballsLimit = 20;
        document.getElementById("ballsAvailableValue").innerHTML = ballsLimit;

        // Ground
        pos.set(0, - 0.5, 0);
        quat.set(0, 0, 0, 1);
        ground = createParalellepiped(80, 1, 80, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF }));
        ground.castShadow = true;
        ground.receiveShadow = true;
        textureLoader.load("../textures/bianco.jpeg", function (texture) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(40, 40);
            ground.material.map = texture;
            ground.material.needsUpdate = true;
        });

        /* *************************************************************************************************** */
        // obstacle a sx
        pos.set(-10, 6, 0);
        quat.set(0, 0, 0, 1);
        var obstacle = createParalellepiped(6, 1, 1, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0x341C04 }));
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;

        // obstacle central
        pos.set(0, 2, 0);
        quat.set(0, 0, 0, 1);
        var obstacle = createParalellepiped(6, 1, 1, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0x341C04 }));
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;

        // obstacle a dx
        pos.set(10, 4, 0);
        quat.set(0, 0, 0, 1);
        var obstacle = createParalellepiped(10, 1, 2, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0x341C04 }));
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        /* *************************************************************************************************** */
        // CUBI
        pos.set(-12, 7, 0); // Imposta la posizione del primo oggetto
        quat.set(0, 0, 0, 1); // Imposta la rotazione del primo oggetto
        object1 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xE06666 })); // Crea il primo oggetto

        pos.set(-10, 7, 0); // Imposta la posizione del secondo oggetto
        object2 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xF6B26B })); // Crea il secondo oggetto

        pos.set(-8, 7, 0); // Imposta la posizione del terzo oggetto
        object3 = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFD966 })); // Crea il terzo oggetto       

        /* *************************************************************************************************** */
        /** CILINDRI
         * radiusTop = raggio superiore del cilindro
         * radiusBottom = raggio inferiore del cilindro
         * height = altezza del cilindro
         * radialSegments  = numero di segmenti radiali
         * mass = massa del cilindro
        */
        pos.set(-2, 6.5, 0); // Imposta la posizione del primo oggetto
        object4 = createCylinder(0.7, 0.7, 1, 20, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0x93C47D }));
        object4.castShadow = true;
        object4.receiveShadow = true;

        pos.set(-0.3, 6.5, 0); // Imposta la posizione del secondo oggetto
        object5 = createCylinder(0.5, 0.5, 1, 20, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0x76A5AF }));
        object5.castShadow = true;
        object5.receiveShadow = true;

        pos.set(2, 6.5, 0); // Imposta la posizione del terzo oggetto
        object6 = createCylinder(0.3, 0.3, 1, 20, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0x6FA8DC }));
        object6.castShadow = true;
        object6.receiveShadow = true;
        /* *************************************************************************************************** */
        // CONI
        pos.set(6, 5, 0); // Imposta la posizione del primo oggetto cono
        object7 = createCone(1, 2, 16, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0x8E7CC3 })); // Crea il primo oggetto cono
        object7.castShadow = true;
        object7.receiveShadow = true;

        pos.set(10, 5, 0); // Imposta la posizione del secondo oggetto cono
        object8 = createCone(1, 2, 16, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xC27BA0 })); // Crea il secondo oggetto cono
        object8.castShadow = true;
        object8.receiveShadow = true;

        pos.set(14, 5, 0); // Imposta la posizione del terzo oggetto cono
        object9 = createCone(1, 2, 16, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0xEA9999 })); // Crea il terzo oggetto cono
        object9.castShadow = true;
        object9.receiveShadow = true;
        /* *************************************************************************************************** */
    }

    function secondLevel() {
        fallenCubes = [];
        // se è vero --> siamo già al secondo livello
        if (JSON.parse(localStorage.getItem("Secondo livello"))) {
            //secondo livello = false
            console.log("vero, siamo al secondo livello!! --> cambiamo")
            localStorage.setItem("Secondo livello", false); //torna al primo livello
        } else if (!JSON.parse(localStorage.getItem("Secondo livello"))) { // non è già al secondo livello
            //gioco dovrebbe passare al secondo livello alla prossima ricarica della pagina
            console.log("vero, siamo al primo livello!! --> cambiamo")
            localStorage.setItem("Secondo livello", true);
        }
    }
});

function restartGame() {
    var modal = document.getElementById("modal");
    modal.style.display = "none";
    location.reload();
}

function restartGame() {
    location.reload();
}
