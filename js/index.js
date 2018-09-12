var EventCenter = {
    on: function (type, handler) {
        $(document).on(type, handler)
    },
    fire: function (type, data) {
        $(document).trigger(type, data)
    }
}

//下方模块的样式及数据获取
var Footer = {
    init: function () {
        this.$footer = $("footer")
        this.$box = this.$footer.find('.box')
        this.$ul = this.$footer.find('ul')
        this.$leftBtn = this.$footer.find('.icon-left')
        this.$rightBtn = this.$footer.find('.icon-right')
        this.isToEnd = false
        this.isToStart = true
        this.isAnimate = false

        this.bind()
        this.render()
    },
    bind: function () {
        var _this = this

        $(window).resize(function () {
            _this.setStyle()
        })

        this.$rightBtn.on('click', function () {
            //防止连续点击button导致多次触发
            if (_this.isAnimate) return
            var itemWidth = _this.$box.find('li').outerWidth(true)
            var rowCount = Math.floor(_this.$box.width() / itemWidth)
            if (!_this.isToEnd) {
                _this.isAnimate = true
                _this.$ul.animate({
                    left: '-=' + rowCount * itemWidth
                }, 400, function () {
                    _this.isAnimate = false
                    _this.isToStart = false
                    if (parseFloat(_this.$box.width()) - parseFloat(_this.$ul.css('left')) >= parseFloat(_this.$ul.css('width'))) {
                        console.log('over')
                        _this.isToEnd = true
                    }
                })
            }
        })
        //点击底部左边按钮向左滑
        this.$leftBtn.on('click', function () {
            if (_this.isAnimate) return
            var itemWidth = _this.$box.find('li').outerWidth(true)
            var rowCount = Math.floor(_this.$box.width() / itemWidth)
            if (!_this.isToStart) {
                _this.isAnimate = true
                _this.$ul.animate({
                    left: '+=' + rowCount * itemWidth
                }, 400, function () {
                    _this.isAnimate = false
                    _this.isToEnd = false
                    if (parseFloat(_this.$ul.css('left')) >= 0) {
                        _this.isToStart = true
                    }
                })
            }
        })

        this.$footer.on('click', 'li', function () {
            $(this).addClass('active')
                .siblings().removeClass('active')
            EventCenter.fire('select-album', {
                channelId: $(this).attr('data-channel-id'),
                channelName: $(this).attr('data-channel-name')
            })
        })

    },

    render: function () {
        var _this = this
        $.getJSON('https://jirenguapi.applinzi.com/fm/getChannels.php')
            .done(function (ret) {
                console.log(ret)
                _this.renderFooter(ret.channels)
            }).fail(function () {
                console.log('获取数据失败')
            })
    },
    //渲染下方选择模块
    renderFooter: function (channels) {
        var _this = this
        var html = ''
        channels.unshift({
            channel_id: 0,
            name: '我的最爱',
            cover_small: 'https://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
            cover_middle: 'https://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
            cover_big: 'https://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
        })
        channels.forEach(function (channel) {
            html += '<li data-channel-id=' + channel.channel_id + ' data-channel-name=' + channel.name + '>' +
                '   <div class="cover" style="background-image:url(' + channel.cover_small + ')"></div>' +
                '   <h3>' + channel.name + '</h3>' +
                '</li>'
        })
        this.$ul.html(html)
        this.setStyle()
    },

    setStyle: function () {
        var count = this.$footer.find('li').length
        var width = this.$footer.find('li').outerWidth(true) //这个width包括外边距
        this.$ul.css({
            width: count * width + 'px'
        })

    }
}

//音乐加载
var Fm = {
    init: function () {
        this.$container = $('.pageMusic')
        this.audio = new Audio()
        this.audio.autoplay = true
        this.currentSong = null
        this.clock = null
        this.collections = this.loadFromLocal()
        this.channelId = 'public_shiguang_80hou'
        this.channelName = '80后'

        this.bind()
        this.playInit()
    },
    

    playInit: function () {
        if (this.collections.length > 0) {
            EventCenter.fire('select-albumn', {
                channelId: '0',
                channelName: '我的最爱'
            })
        } else {
            this.loadMusic()
        }
    },

    bind: function () {
        var _this = this

        EventCenter.on('select-album', function (e, channelIdObj) {
            _this.channelId = channelIdObj.channelId
            _this.channelName = channelIdObj.channelName
            _this.loadMusic()
        })

        this.$container.find('.btn-play').on('click', function () {
            var $btn = $(this)
            if ($btn.hasClass('icon-play')) {
                $btn.removeClass('icon-play').addClass('icon-pause')
                _this.audio.play()
            } else {
                $btn.removeClass('icon-pause').addClass('icon-play')
                _this.audio.pause()
            }
        })

        this.$container.find('.btn-next').on('click', function () {
            _this.loadMusic(function () {
                _this.setMusic()
            })
            console.log('next')
        })

        this.audio.addEventListener('play', function () {
            console.log('play')
            clearInterval(_this.statusClock) //防止播放状态下，点击下一曲，又会触发一次setInterval
            _this.statusClock = setInterval(function () {
                _this.updateStatus()
                _this.loadLyric()
            }, 1000)
        })

        this.audio.addEventListener('pause', function () {
            clearInterval(_this.statusClock)
            console.log('pause')
        })

        this.$container.find('.bar').on('click', function (e) {
            var percent = e.offsetX / parseInt(getComputedStyle(this).width)
            _this.audio.currentTime = _this.audio.duration * percent
        })

        this.$container.find('.btn-collect').on('click', function(){
            var $btn = $(this)
            if($btn.hasClass('active')){
              $btn.removeClass('active')
              delete _this.collections[_this.currentSong.sid]
            }else{
              $(this).addClass('active')
              _this.collections[_this.currentSong.sid] = _this.currentSong
            }
            _this.saveToLocal()
          })

        this.audio.addEventListener('end', function () {
            console.log('pause')
            _this.loadMusic()
        })

    },

    loadMusic: function () {
        var _this = this
        console.log('loadMusic...')
        if (this.channelId === '0') {
            _this.loadCollection()
        } else {
            $.getJSON('https://jirenguapi.applinzi.com/fm/getSong.php', {
                    channel: this.channelId
                })
                .done(function (ret) {
                    _this.song = ret['song'][0]
                    _this.setMusic()
                    _this.loadLyric()
                })
        }

    },

    setMusic: function () {
        var _this = this
        console.log('setMusic...')
        console.log(_this.song)
        this.audio.src = _this.song.url
        $('.bg').css('background-image', 'url(' + _this.song.picture + ')')
        this.$container.find('.aside figure').css('background-image', 'url(' + _this.song.picture + ')')
        this.$container.find('.detail h1').text(_this.song.title)
        this.$container.find('.detail .author').text(_this.song.artist)
        this.$container.find('.tag').text(_this.channelName)
        this.$container.find('.btn-play').removeClass('icon-play').addClass('icon-pause')

        if (this.collections[_this.song.sid]) {
            this.$container.find('.btn-collect').addClass('active')
        } else {
            this.$container.find('.btn-collect').removeClass('active')
        }
    },

    loadLyric: function () {
        var _this = this
        $.getJSON('https://jirenguapi.applinzi.com/fm/getLyric.php', {
                sid: this.song.sid
            })
            .done(function (ret) {
                var lyric = ret.lyric
                var lyricObj = {}
                lyric.split('\n').forEach(function (line) {
                    //[01:03:35][01:04:23] it is new day 或者 [01:03:35] it is new day
                    var times = line.match(/\d{2}:\d{2}/g)
                    var str = line.replace(/\[.+?\]/g, '')
                    if (Array.isArray(times)) {
                        times.forEach(function (time) {
                            lyricObj[time] = str + '#'
                        })
                    } else {
                        lyricObj[times] = str + "#"
                    }
                })
                _this.lyricObj = lyricObj
            })
    },

    updateStatus: function () {
        var minute = Math.floor(this.audio.currentTime / 60)
        var second = Math.floor(this.audio.currentTime % 60) + ''
        second = second.length === 2 ? second : '0' + second
        this.$container.find('.currentTime').text(minute + ':' + second)
        this.$container.find('.bar-progress').css('width', this.audio.currentTime / this.audio.duration * 100 + '%')
        var line = this.lyricObj['0' + minute + ':' + second]
        if (line) {
            this.$container.find('.lyric p').text(line).boomText('slideInUp')
        }
        console.log('update...')
    },

    //收藏的音乐
    loadFromLocal: function () {
        return JSON.parse(localStorage['collections'] || '{}')
    },

    saveToLocal: function () {
        localStorage['collections'] = JSON.stringify(this.collections)
    },

    loadCollection: function () {
        var keyArray = Object.keys(this.collections)
        if (keyArray.length === 0) return
        var randomIndex = Math.floor(Math.random() * keyArray.length)
        var randomSid = keyArray[randomIndex]
        this.play(this.collections[randomSid])
    }
}

//歌词显示效果，封装自己的jQuery，使用第三方css库：animate.css
$.fn.boomText = function (type) {
    type = type || 'rollIn'

    this.html(function () {
        console.log($(this).text())
        var arr = $(this).text()
            .split('#').map(function (word) {
                return '<span class="boomText">' + word + '</span>'
            })
        return arr.join('')
    })

    var index = 0
    var $boomTexts = $(this).find('span')
    var clock = setInterval(function () {
        $boomTexts.eq(index).addClass('animated ' + type)
        index++
        if (index >= $boomTexts.length) {
            clearInterval(clock)
        }
    }, 300)
}

Fm.init()

Footer.init()