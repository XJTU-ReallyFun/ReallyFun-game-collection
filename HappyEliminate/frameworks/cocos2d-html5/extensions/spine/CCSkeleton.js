/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.
 Copyright (c) 2014 Shengxiang Chen (Nero Chan)

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * The main namespace of Spine, all classes, functions, properties and constants of Spine are defined in this namespace
 * @namespace
 * @name sp
 */
var sp = sp || {};

/**
 * The vertex index of spine.
 * @constant
 * @type {{X1: number, Y1: number, X2: number, Y2: number, X3: number, Y3: number, X4: number, Y4: number}}
 */
sp.VERTEX_INDEX = {
    X1: 0,
    Y1: 1,
    X2: 2,
    Y2: 3,
    X3: 4,
    Y3: 5,
    X4: 6,
    Y4: 7
};

/**
 * The attachment type of spine.  It contains three type: REGION(0), BOUNDING_BOX(1) and REGION_SEQUENCE(2).
 * @constant
 * @type {{REGION: number, BOUNDING_BOX: number, REGION_SEQUENCE: number}}
 */
sp.ATTACHMENT_TYPE = {
    REGION: 0,
    BOUNDING_BOX: 1,
    REGION_SEQUENCE: 2
};

/**
 * <p>
 *     The skeleton of Spine.                                                                          <br/>
 *     Skeleton has a reference to a SkeletonData and stores the state for skeleton instance,
 *     which consists of the current pose's bone SRT, slot colors, and which slot attachments are visible.           <br/>
 *     Multiple skeletons can use the same SkeletonData (which includes all animations, skins, and attachments).     <br/>
 * </p>
 * @class
 * @extends cc.Node
 */
sp.Skeleton = cc.Node.extend(/** @lends sp.Skeleton# */{
    _skeleton: null,
    _rootBone: null,
    _timeScale: 1,
    _debugSlots: false,
    _debugBones: false,
    _premultipliedAlpha: false,
    _ownsSkeletonData: null,
    _atlas: null,
    _blendFunc: null,

    /**
     * The constructor of sp.Skeleton. override it to extend the construction behavior, remember to call "this._super()" in the extended "ctor" function.
     */
    ctor:function(skeletonDataFile, atlasFile, scale){
        cc.Node.prototype.ctor.call(this);
        this._blendFunc = {src: cc.BLEND_SRC, dst: cc.BLEND_DST};

        if(arguments.length === 0)
            this.init();
        else
            this.initWithArgs(skeletonDataFile, atlasFile, scale);
    },

    _initRendererCmd:function () {
        if(cc._renderType === cc._RENDER_TYPE_WEBGL)
            this._rendererCmd = new cc.SkeletonRenderCmdWebGL(this);
        else
            this._rendererCmd = new cc.SkeletonRenderCmdCanvas(this);
    },

    /**
     * Initializes a sp.Skeleton. please do not call this function by yourself, you should pass the parameters to constructor to initialize it.
     */
    init: function () {
        cc.Node.prototype.init.call(this);
        this.setOpacityModifyRGB(true);
        this._blendFunc.src = cc.ONE;
        this._blendFunc.dst = cc.ONE_MINUS_SRC_ALPHA;
        if (cc._renderType === cc._RENDER_TYPE_WEBGL)
            this.setShaderProgram(cc.shaderCache.programForKey(cc.SHADER_POSITION_TEXTURECOLOR));
        this.scheduleUpdate();
    },

    /**
     * Sets whether open debug solots.
     * @param {boolean} enable true to open, false to close.
     */
    setDebugSolots:function(enable){
        this._debugSlots = enable;
    },

    /**
     * Sets whether open debug bones.
     * @param {boolean} enable
     */
    setDebugBones:function(enable){
        this._debugBones = enable;
    },

    /**
     * Sets the time scale of sp.Skeleton.
     * @param {Number} v
     */
    setTimeScale:function(v){
        this._timeScale = v;
    },

    /**
     * Initializes sp.Skeleton with Data.
     * @param {spine.SkeletonData|String} skeletonDataFile
     * @param {String|spine.Atlas|spine.SkeletonData} atlasFile atlas filename or atlas data or owns SkeletonData
     * @param {Number} [scale] scale can be specified on the JSON or binary loader which will scale the bone positions, image sizes, and animation translations.
     */
    initWithArgs: function (skeletonDataFile, atlasFile, scale) {
        var argSkeletonFile = skeletonDataFile, argAtlasFile = atlasFile,
            skeletonData, atlas, ownsSkeletonData;

        if (cc.isString(argSkeletonFile)) {
            if (cc.isString(argAtlasFile)) {
                var data = cc.loader.getRes(argAtlasFile);
                sp._atlasLoader.setAtlasFile(argAtlasFile);
                atlas = new spine.Atlas(data, sp._atlasLoader);
            } else {
                atlas = atlasFile;
            }
            scale = scale || 1 / cc.director.getContentScaleFactor();

            var attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
            var skeletonJsonReader = new spine.SkeletonJson(attachmentLoader);
            skeletonJsonReader.scale = scale;

            var skeletonJson = cc.loader.getRes(argSkeletonFile);
            skeletonData = skeletonJsonReader.readSkeletonData(skeletonJson);
            atlas.dispose(skeletonJsonReader);
            ownsSkeletonData = true;
        } else {
            skeletonData = skeletonDataFile;
            ownsSkeletonData = atlasFile;
        }
        this.setSkeletonData(skeletonData, ownsSkeletonData);
        this.init();
    },

    /**
     * Returns the bounding box of sp.Skeleton.
     * @returns {cc.Rect}
     */
    boundingBox: function () {
        var minX = cc.FLT_MAX, minY = cc.FLT_MAX, maxX = cc.FLT_MIN, maxY = cc.FLT_MIN;
        var scaleX = this.getScaleX(), scaleY = this.getScaleY(), vertices = [],
            slots = this._skeleton.slots, VERTEX = sp.VERTEX_INDEX;

        for (var i = 0, slotCount = slots.length; i < slotCount; ++i) {
            var slot = slots[i];
            if (!slot.attachment || slot.attachment.type != sp.ATTACHMENT_TYPE.REGION)
                continue;
            var attachment = slot.attachment;
            sp._regionAttachment_computeWorldVertices(attachment, slot.skeleton.x, slot.skeleton.y, slot.bone, vertices);
            minX = Math.min(minX, vertices[VERTEX.X1] * scaleX, vertices[VERTEX.X4] * scaleX, vertices[VERTEX.X2] * scaleX, vertices[VERTEX.X3] * scaleX);
            minY = Math.min(minY, vertices[VERTEX.Y1] * scaleY, vertices[VERTEX.Y4] * scaleY, vertices[VERTEX.Y2] * scaleY, vertices[VERTEX.Y3] * scaleY);
            maxX = Math.max(maxX, vertices[VERTEX.X1] * scaleX, vertices[VERTEX.X4] * scaleX, vertices[VERTEX.X2] * scaleX, vertices[VERTEX.X3] * scaleX);
            maxY = Math.max(maxY, vertices[VERTEX.Y1] * scaleY, vertices[VERTEX.Y4] * scaleY, vertices[VERTEX.Y2] * scaleY, vertices[VERTEX.Y3] * scaleY);
        }
        var position = this.getPosition();
        return cc.rect(position.x + minX, position.y + minY, maxX - minX, maxY - minY);
    },

    /**
     * Computes the world SRT from the local SRT for each bone.
     */
    updateWorldTransform: function () {
        this._skeleton.updateWorldTransform();
    },

    /**
     * Sets the bones and slots to the setup pose.
     */
    setToSetupPose: function () {
        this._skeleton.setToSetupPose();
    },

    /**
     * Sets the bones to the setup pose, using the values from the `BoneData` list in the `SkeletonData`.
     */
    setBonesToSetupPose: function () {
        this._skeleton.setBonesToSetupPose();
    },

    /**
     * Sets the slots to the setup pose, using the values from the `SlotData` list in the `SkeletonData`.
     */
    setSlotsToSetupPose: function () {
        this._skeleton.setSlotsToSetupPose();
    },

    /**
     * Finds a bone by name. This does a string comparison for every bone.
     * @param {String} boneName
     * @returns {spine.Bone}
     */
    findBone: function (boneName) {
        return this._skeleton.findBone(boneName);
    },

    /**
     * Finds a slot by name. This does a string comparison for every slot.
     * @param {String} slotName
     * @returns {spine.Slot}
     */
    findSlot: function (slotName) {
        return this._skeleton.findSlot(slotName);
    },

    /**
     * Finds a skin by name and makes it the active skin. This does a string comparison for every skin. Note that setting the skin does not change which attachments are visible.
     * @param {string} skinName
     * @returns {spine.Skin}
     */
    setSkin: function (skinName) {
        return this._skeleton.setSkinByName(skinName);
    },

    /**
     * Returns the attachment for the slot and attachment name. The skeleton looks first in its skin, then in the skeleton data???s default skin.
     * @param {String} slotName
     * @param {String} attachmentName
     * @returns {spine.RegionAttachment|spine.BoundingBoxAttachment}
     */
    getAttachment: function (slotName, attachmentName) {
        return this._skeleton.getAttachmentBySlotName(slotName, attachmentName);
    },

    /**
     * Sets the attachment for the slot and attachment name. The skeleton looks first in its skin, then in the skeleton data???s default skin.
     * @param {String} slotName
     * @param {String} attachmentName
     */
    setAttachment: function (slotName, attachmentName) {
        this._skeleton.setAttachment(slotName, attachmentName);
    },

    /**
     * Sets the premultiplied alpha value to sp.Skeleton.
     * @param {Number} alpha
     */
    setOpacityModifyRGB: function (alpha) {
        this._premultipliedAlpha = alpha;
    },

    /**
     * Returns whether to enable premultiplied alpha.
     * @returns {boolean}
     */
    isOpacityModifyRGB: function () {
        return this._premultipliedAlpha;
    },

    /**
     * Sets skeleton data to sp.Skeleton.
     * @param {spine.SkeletonData} skeletonData
     * @param {spine.SkeletonData} ownsSkeletonData
     */
    setSkeletonData: function (skeletonData, ownsSkeletonData) {
        this._skeleton = new spine.Skeleton(skeletonData);
        this._rootBone = this._skeleton.getRootBone();
        this._ownsSkeletonData = ownsSkeletonData;

        if (cc._renderType === cc._RENDER_TYPE_CANVAS) {
            var locSkeleton = this._skeleton, rendererObject, rect;
            for (var i = 0, n = locSkeleton.drawOrder.length; i < n; i++) {
                var slot = locSkeleton.drawOrder[i];
                var attachment = slot.attachment;
                if (!(attachment instanceof spine.RegionAttachment))
                    continue;
                rendererObject = attachment.rendererObject;
                rect = cc.rect(rendererObject.x, rendererObject.y, rendererObject.width,rendererObject.height);
                var sprite = new cc.Sprite(rendererObject.page._texture, rect, rendererObject.rotate);
                this.addChild(sprite,-1);
                slot.currentSprite = sprite;
            }
        }
    },

    /**
     * Return the renderer of attachment.
     * @param {spine.RegionAttachment|spine.BoundingBoxAttachment} regionAttachment
     * @returns {cc.Node}
     */
    getTextureAtlas: function (regionAttachment) {
        return regionAttachment.rendererObject.page.rendererObject;
    },

    /**
     * Returns the blendFunc of sp.Skeleton.
     * @returns {cc.BlendFunc}
     */
    getBlendFunc: function () {
        return this._blendFunc;
    },

    /**
     * Sets the blendFunc of sp.Skeleton.
     * @param {cc.BlendFunc|Number} src
     * @param {Number} [dst]
     */
    setBlendFunc: function (src, dst) {
        var locBlendFunc = this._blendFunc;
        if (dst === undefined) {
            locBlendFunc.src = src.src;
            locBlendFunc.dst = src.dst;
        } else {
            locBlendFunc.src = src;
            locBlendFunc.dst = dst;
        }
    },

    /**
     * Update will be called automatically every frame if "scheduleUpdate" is called when the node is "live".
     * @param {Number} dt Delta time since last update
     */
    update: function (dt) {
        this._skeleton.update(dt);

        if (cc._renderType === cc._RENDER_TYPE_CANVAS) {
            var locSkeleton = this._skeleton;
            locSkeleton.updateWorldTransform();
            var drawOrder = this._skeleton.drawOrder;
            for (var i = 0, n = drawOrder.length; i < n; i++) {
                var slot = drawOrder[i];
                var attachment = slot.attachment, selSprite = slot.currentSprite;
                if (!(attachment instanceof spine.RegionAttachment)) {
                    if(selSprite)
                        selSprite.setVisible(false);
                    continue;
                }
                if(!selSprite){
                    var rendererObject = attachment.rendererObject;
                    var rect = cc.rect(rendererObject.x, rendererObject.y, rendererObject.width,rendererObject.height);
                    var sprite = new cc.Sprite(rendererObject.page._texture, rect, rendererObject.rotate);
                    this.addChild(sprite,-1);
                    slot.currentSprite = sprite;
                }
                selSprite.setVisible(true);
                //update color and blendFunc
                selSprite.setBlendFunc(cc.BLEND_SRC, slot.data.additiveBlending ? cc.ONE : cc.BLEND_DST);

                var bone = slot.bone;
                selSprite.setPosition(bone.worldX + attachment.x * bone.m00 + attachment.y * bone.m01,
                    bone.worldY + attachment.x * bone.m10 + attachment.y * bone.m11);
                selSprite.setScale(bone.worldScaleX, bone.worldScaleY);
                selSprite.setRotation(- (slot.bone.worldRotation + attachment.rotation));
            }
        }
    }
});

/**
 * Creates a skeleton object.
 * @deprecated since v3.0, please use new sp.Skeleton(skeletonDataFile, atlasFile, scale) instead.
 * @param {spine.SkeletonData|String} skeletonDataFile
 * @param {String|spine.Atlas|spine.SkeletonData} atlasFile atlas filename or atlas data or owns SkeletonData
 * @param {Number} [scale] scale can be specified on the JSON or binary loader which will scale the bone positions, image sizes, and animation translations.
 * @returns {sp.Skeleton}
 */
sp.Skeleton.create = function (skeletonDataFile, atlasFile/* or atlas*/, scale) {
    return new sp.Skeleton(skeletonDataFile, atlasFile, scale);
};