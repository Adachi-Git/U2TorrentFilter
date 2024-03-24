// ==UserScript==
// @name         U2 Torrent Filter
// @namespace    https://u2.dmhy.org/userdetails.php?id=59396
// @version      0.5
// @description  Filter torrents
// @author       Adachi
// @match        https://u2.dmhy.org/offers.php*
// @match        https://u2.dmhy.org/torrents.php*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js
// ==/UserScript==

(async function() {
    'use strict';

    // 匹配发布人规则
    const uploaderSelectors = [
        'a[class$="_Name"] bdo', // 匹配以 "_Name" 结尾的 class 属性的 <a> 元素下的 <bdo> 元素
        'span.torrentsign b',
        'a.faqlink',
        '.torrentsign',
        '.AssistantModerator_Name',
        'i'
    ];

    // 确保页面完全加载后再执行脚本
    window.addEventListener('load', async () => {
        // 初始化 localForage
        await localforage.ready();

        // 存储过滤条件到 IndexedDB
        async function saveFilterSettings(selectedUploader, inputNameValue, mode, keywordLogic) {
            const filterSettings = {
                selectedUploader,
                inputNameValue,
                mode,
                keywordLogic
            };
            await localforage.setItem('filterSettings', filterSettings);
        }

        // 从 IndexedDB 加载过滤条件
        async function loadFilterSettings() {
            return await localforage.getItem('filterSettings');
        }

        // 在页面加载时应用过滤条件
        async function applySavedFilterSettings() {
            const savedSettings = await loadFilterSettings();
            if (savedSettings) {
                uploaderDropdown.value = savedSettings.selectedUploader;
                inputName.value = savedSettings.inputNameValue;
                modeSelect.value = savedSettings.mode;
                keywordLogicCheckbox.checked = savedSettings.keywordLogic === 'AND';
                filterTorrents();
            }
        }

        // 获取上传者名称和对应的种子链接，每次获取25个，延时一秒
        async function getAllUploadersWithLinks() {
            const tooltipLinks = document.querySelectorAll('a.tooltip');
            const uploaderLinkPairs = [];

            for (let i = 0; i < tooltipLinks.length; i += 25) {
                const chunk = Array.from(tooltipLinks).slice(i, i + 25);
                //  await new Promise(resolve => setTimeout(resolve, 1000)); // 延时1秒

                const chunkResults = await Promise.all(chunk.map(async link => {
                    const uploaderName = await fetchUploaderName(link);
                    return { uploaderName, link: link.href };
                }));

                uploaderLinkPairs.push(...chunkResults);
            }

            // 建立上传者与其种子链接的映射
            const uploaderMap = new Map();
            uploaderLinkPairs.forEach(pair => {
                const { uploaderName, link } = pair;
                if (!uploaderMap.has(uploaderName)) {
                    uploaderMap.set(uploaderName, []);
                }
                uploaderMap.get(uploaderName).push(link);
            });

            return uploaderMap;
        }


        // 获取发布人名称
        async function fetchUploaderName(link) {
            const cachedUploaderName = await localforage.getItem(link.href); // 从 IndexedDB 中获取缓存的发布人名称

            if (cachedUploaderName) {
                console.log('Retrieving uploader name from cache:', cachedUploaderName); // 记录日志：从缓存中获取发布人名称
                return cachedUploaderName; // 如果缓存存在，则直接返回缓存的发布人名称
            } else {
                try {
                    console.log('Fetching uploader name from network:', link.href); // 记录日志：从网络获取发布人名称
                    const response = await fetch(link.href);
                    const text = await response.text();
                    const parser = new DOMParser();
                    const htmlDocument = parser.parseFromString(text, 'text/html');

                    let uploaderName = '';

                    // 从包含“发布人”的行中提取发布人信息
                    const rowheadElements = htmlDocument.querySelectorAll('td.rowhead');
                    rowheadElements.forEach(rowheadElement => {
                        if (/发布人|發佈人|Uploader|Загрузил|發布人/.test(rowheadElement.textContent.trim())) {
                            const uploaderElement = rowheadElement.nextElementSibling.querySelector(uploaderSelectors.join(', '));
                            if (uploaderElement) {
                                uploaderName = uploaderElement.textContent.trim();
                            }
                        }
                    });

                    // 将获取的发布人名称存入 IndexedDB 缓存
                    await localforage.setItem(link.href, uploaderName);
                    console.log('Uploader name cached:', uploaderName); // 记录日志：发布人名称缓存成功

                    return uploaderName || 'Uploader Name not found';
                } catch (error) {
                    console.error('Error fetching uploader name:', error);
                    return 'Error fetching uploader name';
                }
            }
        }


        // 创建下拉框，并按照首字母排序
        function createDropdown(uploaders) {
            const sortedUploaders = new Map([...uploaders.entries()].sort());
            const select = document.createElement('select');
            const defaultOption = document.createElement('option');
            defaultOption.textContent = 'ALL';
            defaultOption.selected = true;
            select.appendChild(defaultOption);
            sortedUploaders.forEach((links, uploaderName) => {
                const option = document.createElement('option');
                option.textContent = uploaderName;
                option.value = uploaderName;
                select.appendChild(option);
            });
            return select;
        }

        // 创建复选框用于选择关键词之间的逻辑关系
        const keywordLogicCheckbox = document.createElement('input');
        keywordLogicCheckbox.setAttribute('type', 'checkbox');
        keywordLogicCheckbox.id = 'keywordLogicCheckbox';
        keywordLogicCheckbox.checked = false; // 默认为“或”关系

        const keywordLogicLabel = document.createElement('label');
        keywordLogicLabel.textContent = '关键词之间的逻辑关系：';
        keywordLogicLabel.appendChild(keywordLogicCheckbox);
        keywordLogicLabel.appendChild(document.createTextNode('AND'));

        // 创建输入框和按钮
        const inputName = document.createElement('input');
        inputName.setAttribute('type', 'text');
        inputName.setAttribute('placeholder', 'Enter torrent name');

        const modeSelect = document.createElement('select'); // 创建模式选择器
        const modeOption1 = document.createElement('option');
        modeOption1.textContent = 'Include'; //既与选定的上传者相关，又包含用户输入的关键词。
        modeOption1.value = 'mode1';

        const modeOption2 = document.createElement('option');
        modeOption2.textContent = 'Exclude'; // 排除选择的上传者与关键词相关的种子，选择了特定的上传者，并输入了关键词，排除特定上传者含关键词的种子，显示特定上传者的不包含关键词的种子。不会显示其他上传者的种子。
        modeOption2.value = 'mode2';

        const modeOption3 = document.createElement('option');
        modeOption3.textContent = 'Include Uploader Only';
        modeOption3.value = 'mode3';

        const modeOption4 = document.createElement('option');
        modeOption4.textContent = 'Exclude Uploader Only';
        modeOption4.value = 'mode4';

        const modeOption5 = document.createElement('option');
        modeOption5.textContent = 'Exclude Uploader and Keywords'; //不显示选定上传者的任何种子，同时也不显示包含用户输入的关键词的种子。
        modeOption5.value = 'mode5';

        modeSelect.appendChild(modeOption1);
        modeSelect.appendChild(modeOption2);
        modeSelect.appendChild(modeOption3);
        modeSelect.appendChild(modeOption4);
        modeSelect.appendChild(modeOption5);


        const button = document.createElement('button');
        button.textContent = 'Filter';
        button.addEventListener('click', filterTorrents);

        // 获取所有发布人名称和相应的种子链接
        const uploadersWithLinks = await getAllUploadersWithLinks();

        // 创建下拉框
        const uploaderDropdown = createDropdown(uploadersWithLinks);

        // 将输入框、按钮和下拉框添加到页面中
        const container = document.createElement('div');
        container.appendChild(modeSelect); // 添加模式选择器
        container.appendChild(uploaderDropdown); // 添加下拉框
        container.appendChild(inputName);
        container.appendChild(button);
        container.appendChild(keywordLogicLabel); // 添加关键词逻辑选择器

        // 添加到种子名称列的后面
        const nameColumn = document.querySelector('td.colhead:nth-child(2)');
        if (nameColumn) {
            nameColumn.appendChild(container);
        }

        // 在页面加载时应用保存的过滤条件
        await applySavedFilterSettings();

        // 筛选种子的函数
        async function filterTorrents() {
            const selectedUploader = uploaderDropdown.value;
            const inputNameValue = inputName.value.trim().toLowerCase();
            const mode = modeSelect.value; // 获取选择的模式

            // 将输入的关键词拆分成数组
            const keywords = inputNameValue.split(/[,\uff0c]+/);

            // 获取关键词之间的逻辑关系
            const keywordLogic = keywordLogicCheckbox.checked ? 'AND' : 'OR';

            const torrents = document.querySelectorAll('.torrentname');

            torrents.forEach(torrent => {
                const torrentName = torrent.textContent.toLowerCase();

                // 获取种子链接的发布人名称
                const uploaderElement = torrent.parentElement.parentElement.querySelector('a.tooltip');
                const uploaderLink = uploaderElement ? uploaderElement.href : '';

                // 根据选择的模式进行筛选
                if (mode === 'mode1') {
                    // Mode 1
                    if ((selectedUploader === 'ALL' && matchesKeywords(torrentName, keywords, keywordLogic)) ||
                        (selectedUploader !== 'ALL' && uploadersWithLinks.get(selectedUploader).includes(uploaderLink) && matchesKeywords(torrentName, keywords, keywordLogic))) {
                        torrent.parentElement.parentElement.style.display = ''; // 显示符合条件的种子行
                    } else {
                        torrent.parentElement.parentElement.style.display = 'none'; // 隐藏不符合条件的种子行
                    }
                } else if (mode === 'mode2') {
                    // Mode 2
                    if (selectedUploader === 'ALL') {
                        if (inputNameValue === '') {
                            torrent.parentElement.parentElement.style.display = 'none'; // 隐藏所有种子行
                        } else {
                            if (matchesKeywords(torrentName, keywords, keywordLogic)) {
                                torrent.parentElement.parentElement.style.display = 'none'; // 隐藏符合条件的种子行
                            } else {
                                torrent.parentElement.parentElement.style.display = ''; // 显示不符合条件的种子行
                            }
                        }
                    } else {
                        if (inputNameValue === '') {
                            if (uploadersWithLinks.get(selectedUploader).includes(uploaderLink)) {
                                torrent.parentElement.parentElement.style.display = 'none'; // 隐藏与特定发布者相关的种子行
                            } else {
                                torrent.parentElement.parentElement.style.display = ''; // 显示不相关的种子行
                            }
                        } else {
                            if (uploadersWithLinks.get(selectedUploader).includes(uploaderLink)) {
                                if (matchesKeywords(torrentName, keywords, keywordLogic)) {
                                    torrent.parentElement.parentElement.style.display = 'none'; // 隐藏符合条件的种子行
                                } else {
                                    torrent.parentElement.parentElement.style.display = ''; // 显示不符合条件的种子行
                                }
                            } else {
                                torrent.parentElement.parentElement.style.display = 'none'; // 隐藏其他发布者的种子行
                            }
                        }
                    }
                } else if (mode === 'mode3') {
                    // Mode 3
                    if (selectedUploader === 'ALL') {
                        torrent.parentElement.parentElement.style.display = ''; // 显示全部发布人的种子行
                    } else {
                        if (selectedUploader !== 'ALL'
                            && uploadersWithLinks.get(selectedUploader).includes(uploaderLink)) {
                            torrent.parentElement.parentElement.style.display = ''; // 显示用户选择的发布者的种子行
                        } else {
                            torrent.parentElement.parentElement.style.display = 'none'; // 隐藏其他发布者的种子行
                        }
                    }
                } else if (mode === 'mode4') {
                    // Mode 4
                    if (selectedUploader === 'ALL') {
                        torrent.parentElement.parentElement.style.display = 'none'; // 隐藏全部发布人的种子行
                    } else {
                        if (selectedUploader !== 'ALL' && uploadersWithLinks.get(selectedUploader).includes(uploaderLink)) {
                            torrent.parentElement.parentElement.style.display = 'none'; // 隐藏用户选择的发布者的种子行
                        } else {
                            torrent.parentElement.parentElement.style.display = ''; // 显示其他发布者的种子行
                        }
                    }
                }else if (mode === 'mode5') {
                    // Mode 5
                    torrents.forEach(torrent => {
                        const torrentName = torrent.textContent.toLowerCase();

                        // 获取种子链接的发布人名称
                        const uploaderElement = torrent.parentElement.parentElement.querySelector('a.tooltip');
                        const uploaderLink = uploaderElement ? uploaderElement.href : '';

                        if (selectedUploader === 'ALL' || !uploadersWithLinks.get(selectedUploader).includes(uploaderLink)) {
                            // 当种子的发布者不是选定的发布者时，执行以下操作：
                            if (!matchesKeywords(torrentName, keywords, keywordLogic)) {
                                // 当种子名称不包含指定关键词时，显示该种子行。
                                torrent.parentElement.parentElement.style.display = '';
                            } else {
                                // 当种子名称包含指定关键词时，隐藏该种子行。
                                torrent.parentElement.parentElement.style.display = 'none';
                            }
                        } else {
                            // 当种子的发布者是选定的发布者时，隐藏该种子行。
                            torrent.parentElement.parentElement.style.display = 'none';
                        }
                    });
                }

            });

            // 保存过滤条件到 IndexedDB
            await saveFilterSettings(selectedUploader, inputNameValue, mode, keywordLogic);
        }

        function matchesKeywords(torrentName, keywords, logic) {
            // 如果关键词数组为空，则直接返回 true（表示匹配成功）
            if (keywords.length === 0) {
                return true;
            }

            // 根据逻辑关系检查种子名称是否与关键词匹配
            if (logic === 'OR') {
                // 使用“或”关系：只要有一个关键词匹配
                return keywords.some(keyword => torrentName.includes(keyword));
            } else {
                // 使用“与”关系：所有关键词都必须匹配
                return keywords.every(keyword => torrentName.includes(keyword));
            }
        }
    });
})();
