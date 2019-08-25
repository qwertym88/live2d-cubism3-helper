var LIVE2DCUBISMCORE = Live2DCubismCore

/////////////////杂碎
//加载模型开始
function loadStartHandler(){
    console.log("Start loading Model");
}
//加载模型结束
function loadCompleteHandler(){
    console.log('Model initialized');
    PIXI.loader.off("start", loadStartHandler);//监听事件在加载完毕后取消
    PIXI.loader.off("complete", loadCompleteHandler);//监听事件在加载完毕后取消
}
/////////////////live2dModel
var live2dModel=function(){
	this.motionHandler=null;//处理动作
    this.hitAreas=[];
	this.wrap=null;//以下三个都是dom元素罢了
	this.canvas=null;
	this.audio=null;
    this.modelDefine={//默认值
        model_x : 0,
        model_y : 0,
        width : 600,
        height : 600,
        scale : 30,
        globalFollow:false//暂不支持全局跟随
    }
	this._app=null;//以下两个可以不用管他
	this._model=null;
}
live2dModel.prototype.load = function(path,define){
	var ajax = null;
    var _this=this;
	this.motionHandler=new MotionHandler();
    //存入modelDefine
    for(let key in define){
        this.modelDefine[key]=define[key];
    }
	//获取div中canvas和audio
	this.wrap=document.querySelector(this.modelDefine.target);
	if(document.querySelector(this.modelDefine.target+' canvas')){
		this.canvas=document.querySelector(this.modelDefine.target+' canvas');
	}else{
		let c=document.createElement('canvas');
		this.canvas=this.wrap.appendChild(c);
	}
	if(document.querySelector(this.modelDefine.target+' audio')){
		this.audio=document.querySelector(this.modelDefine.target+' audio');
	}else{
		let c=document.createElement('audio');
		this.audio=this.wrap.appendChild(c);
	}
	//获取model.json
    if(window.XMLHttpRequest){ajax = new XMLHttpRequest();}else if(window.ActiveObject){
        ajax = new ActiveXObject("Microsoft.XMLHTTP");
    }else{
        throw new Error('loadModelJsonError');
    }  
    ajax.open('GET', path , true);
    ajax.send();
    ajax.onreadystatechange = function(){
        if(ajax.readyState == 4){  
            if(ajax.status == 200){ 
                let data = JSON.parse(ajax.responseText)
                _this._initModel(data,path);
            }else{
                console.error('Response error,Code:' + ajax.status);
            }
        }
    };
};
live2dModel.prototype.resize = function(w=this.modelDefine.width,h=this.modelDefine.height,s=this.modelDefine.scale,_x=this.modelDefine.model_x,_y=this.modelDefine.model_y){
    this._app.view.style.width = w + "px";
    this._app.view.style.height = h + "px";
    this._app.renderer.resize(w, h);
    this._model.position = new PIXI.Point(w/2 + _x, h/2 + _y);
    this._model.scale = new PIXI.Point(s,s);
    this._model.masks.resize(this._app.view.width, this._app.view.height);
};
live2dModel.prototype._initModel = function(data,path){
	let model3Obj = {data:data,url: path.substr(0, path.lastIndexOf('/') + 1)};
    //清除loader内的内容，并清除缓存中的内容
    PIXI.loader.reset();
    PIXI.utils.destroyTextureCache();
    for (let key in data.FileReferences.Motions) {
        this.motionHandler.loadMotionGroup(key,data.FileReferences.Motions[key],path);
    }
    this.hitAreas=data.HitAreas;
    this.hitAreas.sort(function (a,b) {//Order大的排在前
        return b.Order-a.Order;
    })
    //调用此方法直接加载，并传入设置模型的回调方法
    new LIVE2DCUBISMPIXI.ModelBuilder().buildFromModel3Json(
      PIXI.loader
        .on("start", loadStartHandler)
        .on("complete", loadCompleteHandler),
      model3Obj,
      this._setModel,
      this//一个很奇葩的代码，惭愧啊。主要是实在没想到什么办法传递this了
    );  
};
live2dModel.prototype._setModel = function(model,_this){//_this=this的套路
	if(_this._app != null){_this._app.stop();}
    _this._app = new PIXI.Application(_this.modelDefine.width,_this.modelDefine.height, {transparent: true ,view:_this.canvas});
    _this._app.stage.addChild(model);
    _this._app.stage.addChild(model.masks);
    _this._model=model;//无用代码，方便未来

    //加载动作
    _this.motionHandler._setmotion(model,PIXI.loader.resources);

    //设置鼠标动作
    _setMouseEvent(_this);
    
    //将模型放大到指定大小
    _this.resize();
    // window.onresize=function(event){
    //     console.log('aaaa');
    //     if (event === void 0) { event = null; }
    //     _this._app.view.style.width = modelDefine.modelWidth + "px";
    //     _this._app.view.style.height = modelDefine.modelHeight + "px";
    //     _this._app.renderer.resize(modelDefine.modelWidth, height);
    //     model.position = new PIXI.Point(modelDefine.modelWidth/2 + modelDefine.model_x, modelDefine.modelHeight/2 + modelDefine.model_y);
    //     model.scale = new PIXI.Point(modelDefine.scale,modelDefine.scale);
    //     model.masks.resize(app.view.width, app.view.height);
    // };
    
};

////////////////有点重要的函数
//处理鼠标事件的
function _setMouseEvent (_this) {
    //眼睛跟随鼠标
    var rect = _this.canvas.getBoundingClientRect();
    var mouse_on=false;
    var resetTime=1000;//转回直视的时间，随便改
    var delay=1000;//转回直视的延时
    var step=20;//为了让转回直视的过程更顺滑而已，同上

    if('scrollingElement' in document){
        var scrollElm=document.scrollingElement;
    }else if(navigator.userAgent.indexOf('WebKit') != -1){
        var scrollElm=document.body;
    }else{
        var scrollElm=document.documentElement;
    }
    //我个人倾向以相对页面左上角定位来，应该是绝对定位
    var w=_this.modelDefine.width,h= _this.modelDefine.height;
    var center_x = w/2 + rect.left + scrollElm.scrollLeft;
    var center_y = h/2 + rect.top + scrollElm.scrollTop;
    var mouse_x = center_x, mouse_y = center_y;
    _this.motionHandler._center_x=center_x;//没见过这么糟心的代码
    _this.motionHandler._center_y=center_y;
    _this.motionHandler._scale=_this.modelDefine.scale;
    _this.motionHandler.globalFollow=_this.modelDefine.globalFollow;
    _this.motionHandler.w=_this.modelDefine.width;
    _this.motionHandler.h=_this.modelDefine.height;
    //更新眼睛位置
    _this._app.ticker.add(function (deltaTime) {
        rect = _this.canvas.getBoundingClientRect();
        if(!_this.modelDefine.globalFollow){//没有全局跟随时是根据pageX/Y
            _this.motionHandler.lookAt(mouse_x,mouse_y);
        }else{//全局跟随时是根据clientX/Y
            let cx=mouse_x-scrollElm.scrollLeft;
            let cy=mouse_y-scrollElm.scrollTop;
            //！错误代码
            _this.motionHandler.lookAt((cx-center_x)/(w/2 + rect.left),1-(cx-center_x)/(h/2 + rect.top));//提前算了
        }
        
        _this._model.update(deltaTime);
        _this._model.masks.update(_this._app.renderer);
    });
    var mouseMove;
    var d;
    //区分是否全局跟随
    if(!_this.modelDefine.globalFollow){
        _this.canvas.addEventListener("mouseover",function(){
            mouse_on=true;
        });
        _this.canvas.addEventListener("mouseout",function(){//正视前方
            mouse_on=false;
            window.clearTimeout(mouseMove);
            window.clearTimeout(d);
            d=window.setTimeout(function () {
                if(_this.motionHandler._priority==0){
                    var x = mouse_x - center_x;
                    var y = mouse_y - center_y;
                    for(var i=0;i<step;i++){
                        mouseMove = window.setTimeout(function () {
                            mouse_x-=x/step;
                            mouse_y-=y/step;
                        },i*resetTime/step);
                    }
                }
            },delay);
        });
    }
    
    document.addEventListener("mousemove", function(e){
        if(_this.modelDefine.globalFollow || mouse_on){
            window.clearTimeout(mouseMove);
            mouse_x = e.pageX;//绝对定位
            mouse_y = e.pageY;
            var x = mouse_x - center_x;
            var y = mouse_y - center_y;
            mouseMove =  window.setTimeout(function () {
                if(_this.motionHandler._priority==0){
                    for(var i=0;i<step;i++){
                        window.setTimeout(function () {
                            mouse_x-=x/step;
                            mouse_y-=y/step;
                        },i*resetTime/step);
                    }
                }
            },5000);//随便改吧，事实上我也有点嫌弃这个代码
        }       
    });

    var last_x,last_y;
    _this.canvas.onmousedown=function(e){
        last_x=mouse_x,last_y=mouse_y;
    }
    _this.canvas.onmouseup=function (e) {
        for(let i=0;i<_this.hitAreas.length;i++){
            if(_this.motionHandler.isHit(_this.hitAreas[i].Id,mouse_x,mouse_y)){
                console.log('hit on '+_this.hitAreas[i].Name);
                _this.motionHandler.startRadomMotion(_this.hitAreas[i].MotionGroup);
                break;
            }
        }
    }
}




//////////MotionHandler兼职处理语音,最终决定所有与动作相关的都在这里
/*
虽说原来的有，但还是自己写好
强烈吐槽this._model.animator.getLayer('motion')，里头有个什么stop的，停止了后疯狂
调用回调，而且实际意义也不大
有个isPlay的，事实上动作结束后它仍然是true，仅仅是play和stop中的一个跑腿的
*/
var MotionHandler=function () {
	this.motionGroups={};//动作分组
	this.motionFile={};//动作文件
    this.globalFollow=false;//
	this._model;
	this._onDisplay=false;//是否正在播放
	this._priority=0;//当前优先级
	this._c=function(){//动作完成回调函数
		this._onDisplay=false;
		this._priority=0;
        this._model.animator.getLayer("motion").stop();
        this.breath();
        this.eyeBlink();
	};
    this._map=function (r,i) {//x->x，i->index
        let a=this._model.parameters.maximumValues[i];
        let b=this._model.parameters.minimumValues[i];
        return b+r*(a-b);
    }
    this._center_x;//仅仅是用来定位的
    this._center_y;
    this._scale;
    this.w;
    this.h
    this._breath;//只是一个占位置的
    this._eyeBlink;
}
MotionHandler.prototype.loadMotionGroup = function(key,motion,path){
	if(key==null){
        console.log('no key find');
        return;
    }
    if(motion.length >0){
    	let a=[];
        for (var i = 0; i < motion.length; i++) {
            
            var f=motion[i].File;
            var n=f.slice(f.lastIndexOf('/')+1,f.indexOf('.',f.lastIndexOf('/')));
        	this.motionFile[n]=motion[i];
            a.push(n);
            PIXI.loader.add(f, path.substr(0, path.lastIndexOf('/') + 1) + f, { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON });
         	console.log('load '+f+' in '+key);
        }
        this.motionGroups[key]=a;
    }else{
        console.error('Not find motions in '+key);
    }
};
MotionHandler.prototype._setmotion = function(model,resources){
	this._model=model;
    for (let key in resources) {
        if(key.indexOf('motion') != -1){
            let n=key.slice(key.indexOf('/')+1,key.indexOf('.'));
            let a=LIVE2DCUBISMFRAMEWORK.Animation.fromMotion3Json(resources[key].data);
            a.addAnimationCallback(this._c.bind(this));//加入回调
            a.loop=false;//确保万一，以免无限循环
            this.motionFile[n]['src']=a;
        }
    }
    if(this.motionFile){
        //console.log('aaa');
        this._model.animator.addLayer("motion", LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1.0);
    }
    this._c();
};
MotionHandler.prototype.startMotion = function(name,priority=3){
	if(this._onDisplay && priority<=this._priority){
		//console.log('priority forbidden');
		return;
	}else{
		this._onDisplay=true;
		this._priority=priority;
        this.breath(false);//避免节外生枝
        this.eyeBlink(false);
		this._model.animator.getLayer("motion").stop();
		this._model.animator.getLayer('motion').play(this.motionFile[name].src);
	}
};
MotionHandler.prototype.startRadomMotion = function(group){
    var a=Math.floor(Math.random()*100)%this.motionGroups[group].length;
    this.startMotion(this.motionGroups[group][a],2);
};
MotionHandler.prototype.lookAt = function(mouse_x,mouse_y){
       if(this._priority==0){//最小的优先级
            let x = mouse_x - this._center_x;
            let y = mouse_y - this._center_y;
            let angle_x = this._model.parameters.ids.indexOf("ParamAngleX");
            if(angle_x < 0){ angle_x = this._model.parameters.ids.indexOf("PARAM_ANGLE_X"); }
            let angle_y = this._model.parameters.ids.indexOf("ParamAngleY");
            if(angle_y < 0){ angle_y = this._model.parameters.ids.indexOf("PARAM_ANGLE_Y"); }
            let eye_x = this._model.parameters.ids.indexOf("ParamEyeBallX");
            if(eye_x < 0){ eye_x = this._model.parameters.ids.indexOf("PARAM_EYE_BALL_X"); }
            let eye_y = this._model.parameters.ids.indexOf("ParamEyeBallY");
            if(eye_y < 0){ eye_y = this._model.parameters.ids.indexOf("PARAM_EYE_BALL_Y"); }
            if(this.globalFollow){
                //！错误代码
                this._model.parameters.values[angle_x] = this._map(x,angle_x);
                this._model.parameters.values[angle_y] = this._map(y,angle_y);
                this._model.parameters.values[eye_x] = this._map(x,eye_x);
                this._model.parameters.values[eye_y] = this._map(y,eye_y);
            }else{
                this._model.parameters.values[angle_x] = this._map((x+this.w/2)/this.w,angle_x);
                this._model.parameters.values[angle_y] = this._map(1-(y+this.h/2)/this.h,angle_y);
                this._model.parameters.values[eye_x] = this._map((x+this.w/2)/this.w,eye_x);
                this._model.parameters.values[eye_y] = this._map(1-(y+this.h/2)/this.h,eye_y);
            }
       }
};
MotionHandler.prototype.breath = function(a=true){
    var bt=2000;//半口气的时间而已
    var step=50;//精度随便调
    var a=1;//进气
    var b=this._model.parameters.ids.indexOf("ParamBreath");
    if(b==-1){b=this._model.parameters.ids.indexOf("Param_Breath");}
    var s=(this._model.parameters.maximumValues[b]-this._model.parameters.minimumValues[b])/step;
    this._model.parameters.values[b]=this._model.parameters.minimumValues[b];
    var i=step;
    if(a){
        this._breath=window.setInterval(function (_this) {
            i--;
            if(i<=0){i=step;a=-a;}
            _this._model.parameters.values[b]+=s*a;
        },bt/step,this);
    }else{
        window.clearInterval(this._breath);
    }
};
MotionHandler.prototype.eyeBlink = function(a=true){
    if(a){
        var t=5000;//大概最少多久眨眼
        var c=360;//眨眼几秒钟（按道理100就行了）
        var r=0;//为了真实，得随机一些
        var step=8;//精度随便调
        var el=this._model.parameters.ids.indexOf("ParamEyeLOpen");
        var er=this._model.parameters.ids.indexOf("ParamEyeROpen");
        var s=(this._model.parameters.values[el]-this._model.parameters.minimumValues[el])/step;//我不信会有模型把这两个值范围设的不一样
        this._eyeBlink=window.setInterval(function (_this) {//无脑代码
            r=Math.floor(Math.random()*1000);
            for(let i=0;i<step*2;i++){
                let q=1;
                if(i>=step){q=-q;}
                window.setTimeout(function (_this) {
                    _this._model.parameters.values[el]-=s*q;
                    _this._model.parameters.values[er]-=s*q;
                },(c/step)*i,_this)
            }
        },t+r,this)
    }else{
        window.clearInterval(this._eyeBlink);
    }
};
MotionHandler.prototype.isHit = function(id,pointX,pointY){
    let d=this._model.drawables;
    //console.log('aaa');
    let index=d.ids.indexOf(id);
    //console.log(index);
    let count=d.vertexCounts[index];
    let vertices=d.vertexPositions[index];
    let left = vertices[0];
    let right = vertices[0];
    let top = vertices[1];
    let bottom = vertices[1];
    for(let j = 1; j < count; ++j){
        let x = vertices[0 + j * 2];
        let y = vertices[0 + j * 2 + 1];
        if(x < left){left = x;}// Min x      
        if(x > right){right = x;}// Max x
        if(y < top){top = y;}// Min y
        if(y > bottom){bottom = y;}// Max y
    }
    let tx=pointX;
    let ty=pointY;
    left=left*this._scale+this._center_x;
    right=right*this._scale+this._center_x;
    top=-top*this._scale+this._center_y;//万分注意它这个模型上下是反的
    bottom=-bottom*this._scale+this._center_y;
    return ((left <= tx) && (tx <= right) && (top >= ty) && (ty >= bottom));
};
