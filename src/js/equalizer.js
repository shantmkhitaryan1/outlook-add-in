var app = {
  createAudioEqualizer: function (sourceId) {
		var canvas = document.getElementById("audio-indicator");
		if (canvas == null) return;
		window.AudioContext = window.AudioContext || window.webkitAudioContext, audioContext = new AudioContext();
		
		chrome.storage.sync.get(null, function (items) {
			if (chrome.runtime.lastError) {
				return;
			}
			startEqCreation(items['audio-input']);						
		})
		
		function startEqCreation(sourceId){
			var audioOptions = sourceId ? { optional: [{ sourceId: sourceId }] } : true;
			navigator.mediaDevices && navigator.mediaDevices.getUserMedia({
				audio: audioOptions,
				video: false
			})
			.then(function (e) {
				//app.disableEqualizerStream();
				app.equalizerStream  = e;
				var o = audioContext.createMediaStreamSource(e);					
				app.meter = app.createAudioMeter(audioContext);
				o.connect(app.meter);
				app.drawMeter(app.meter)

			})
			.catch(function (e) {
				console.log("catch", e);
				canvas.style.display = "none";
			})
		}
		
		
		
		app.interval = setInterval(() => {
			audioContext.resume().then(() => {
				clearInterval(app.interval);	
				if(app.equalizerStream){								
					var o = audioContext.createMediaStreamSource(app.equalizerStream);					
					app.meter = app.createAudioMeter(audioContext);
					o.connect(app.meter);
					app.drawMeter(app.meter);
				}
			})
		}, 500);
	   
	},

	drawMeter: function (e) {
		var canvasContext = document.getElementById("audio-indicator").getContext("2d");
		var canvasHeight = document.getElementById("audio-indicator").height;
		var canvasWidth = document.getElementById("audio-indicator").width;
		var i = canvasWidth / 2 - 65,
			o = canvasHeight,
			t = -app.meter.volume * canvasHeight * 5;
		canvasContext.clearRect(0, 0, canvasWidth, canvasHeight), canvasContext.fillStyle = "rgba(0, 0, 0, 0.2)", canvasContext.strokeStyle = "red", app.roundRect(canvasContext, i - 10, o - canvasHeight, 150, canvasHeight, 50, "rgba(200,200,200,0.1)", "rgba(0,0,0,0.2)", 20), canvasContext.fillStyle = "black", canvasContext.fillRect(i, o, 130, -10), app.meter.checkClipping() && (canvasContext.fillStyle = "red");
		var n = app.map(Math.abs(t), 0, 200, 50, 255);
		canvasContext.fillStyle = "rgb(" + Math.floor(n) + "," + Math.floor(205 - n / 2) + ",50)", canvasContext.fillRect(i, o, 130, t), window.requestAnimationFrame(app.drawMeter)
	},

	createAudioMeter: function (audioContext, clipLevel, averaging, clipLag) {
		var processor = audioContext.createScriptProcessor(512);
		processor.onaudioprocess = app.volumeAudioProcess;
		processor.clipping = false;
		processor.lastClip = 0;
		processor.volume = 0;
		processor.clipLevel = clipLevel || 0.98;
		processor.averaging = averaging || 0.95;
		processor.clipLag = clipLag || 750;

		// this will have no effect, since we don't copy the input to the output,
		// but works around a current Chrome bug.
		processor.connect(audioContext.destination);

		processor.checkClipping =
			function () {
				if (!this.clipping)
					return false;
				if ((this.lastClip + this.clipLag) < window.performance.now())
					this.clipping = false;
				return this.clipping;
			};

		processor.shutdown =
			function () {
				this.disconnect();
				this.onaudioprocess = null;
			};

		return processor;
	},

	volumeAudioProcess: function (event) {
		var buf = event.inputBuffer.getChannelData(0);
		var bufLength = buf.length;
		var sum = 0;
		var x;

		// Do a root-mean-square on the samples: sum up the squares...
		for (var i = 0; i < bufLength; i++) {
			x = buf[i];
			if (Math.abs(x) >= this.clipLevel) {
				this.clipping = true;
				this.lastClip = window.performance.now();
			}
			sum += x * x;
		}

		// ... then take the square root of the sum.
		var rms = Math.sqrt(sum / bufLength);

		// Now smooth this out with the averaging factor applied
		// to the previous sample - take the max here because we
		// want "fast attack, slow release."		
		this.volume = Math.max(rms, this.volume * this.averaging);
	},
	  roundRect: function (e, i, o, t, n, a, r, c, s) {
		var d = void 0 === c || 0 !== c;
		a = void 0 === a ? 5 : a, e.save(), e.beginPath(), e.moveTo(i + a, o), e.lineTo(i + t - a, o), e.quadraticCurveTo(i + t, o, i + t, o + a), e.lineTo(i + t, o + n - a), e.quadraticCurveTo(i + t, o + n, i + t - a, o + n), e.lineTo(i + a, o + n), e.quadraticCurveTo(i, o + n, i, o + n - a), e.lineTo(i, o + a), e.quadraticCurveTo(i, o, i + a, o), e.closePath(), e.lineWidth = s, d && 0 !== c && (e.strokeStyle = void 0 === c ? "#000" : c, e.stroke()), r && (e.fillStyle = r, e.fill()), e.restore()
	},

	map: function (e, i, o, t, n) {
		return e > o ? n : e < i ? t : (e - i) * (n - t) / (o - i) + t
	},
  }
app.createAudioEqualizer();