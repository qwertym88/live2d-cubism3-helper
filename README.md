# live2d-cubism3-helper
quick display for cubism3 models on your website

第一个项目，不胜欢喜，正在补充文档中（顺便学习如何使用github），多多支持吧

## BUG报告
8/26：（昨晚睡觉时想到的）
1. 模型中点的位置（model.motionHandler._center_x/y）忘记加上偏移了（resize里的最后两个参数）
2. 待补充

11/23
1. 打算完全推翻之前的设计，以简洁为主，特色在于方便地绑定回调函数吧。。

## TODO
1. 动作与声音绑定（应该非常快），细节如口型匹配可暂不考虑
2. 动作开始/结束事件（也应该非常快）
3. 文字/对话
4. modelDefine增加binding项，用于所有与网页相关交互的绑定（model3.json用于所有与模型相关的）
5. 基本严格按照http://live2d.pavostudio.com/doc/zh-cn/live2d/model-config-sdk3 及其所可以配置的功能编写程序

## 后记
随缘更新中......（身不由己，由老师/作业量啊）
啊，这个还是等到寒假再说吧，而且确实只能随缘了
