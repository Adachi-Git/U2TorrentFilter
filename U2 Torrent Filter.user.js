// ==UserScript==
// @name         U2 Torrent Filter
// @namespace    https://u2.dmhy.org/userdetails.php?id=59396
// @version      0.5
// @description  Filter torrents by uploader name and display uploader information
// @author       Adachi
// @match        https://u2.dmhy.org/offers.php
// @match        https://u2.dmhy.org/torrents.php*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js
// ==/UserScript==

(async function() {
    'use strict';

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
                        if (/发布人|發佈人|發布人/.test(rowheadElement.textContent.trim())) {
                            const uploaderElement1 = rowheadElement.nextElementSibling.querySelector('a.VeteranUser_Name bdo');
                            const uploaderElement2 = rowheadElement.nextElementSibling.querySelector('span.torrentsign b');
                            const uploaderElement3 = rowheadElement.nextElementSibling.querySelector('i');
                            const uploaderElement4 = rowheadElement.nextElementSibling.querySelector('a.Uploader_Name bdo');
                            const uploaderElement5 = rowheadElement.nextElementSibling.querySelector('a.NexusMaster_Name bdo');
                            const uploaderElement6 = rowheadElement.nextElementSibling.querySelector('a.InsaneUser_Name bdo');
                            const uploaderElement7 = rowheadElement.nextElementSibling.querySelector('a.UltimateUser_Name bdo');
                            const uploaderElement8 = rowheadElement.nextElementSibling.querySelector('a.ExtremeUser_Name bdo');
                            const uploaderElement9 = rowheadElement.nextElementSibling.querySelector('a.PowerUser_Name bdo');
                            const uploaderElement10 = rowheadElement.nextElementSibling.querySelector('a.CrazyUser_Name bdo');
                            const uploaderElement11 = rowheadElement.nextElementSibling.querySelector('a.User_Name bdo');
                            const uploaderElement12 = rowheadElement.nextElementSibling.querySelector('a.EliteUser_Name bdo');
                            const uploaderElement13 = rowheadElement.nextElementSibling.querySelector('a.Retiree_Name bdo');
                            const uploaderElement14 = rowheadElement.nextElementSibling.querySelector('a.Moderator_Name bdo');
                            const uploaderElement15 = rowheadElement.nextElementSibling.querySelector('a.SysOp_Name bdo');



                            if (uploaderElement1) {
                                uploaderName = uploaderElement1.textContent.trim();
                            } else if (uploaderElement2) {
                                uploaderName = uploaderElement2.textContent.trim();
                            } else if (uploaderElement3) {
                                uploaderName = uploaderElement3.textContent.trim();
                            } else if (uploaderElement4) {
                                uploaderName = uploaderElement4.textContent.trim();
                            } else if (uploaderElement5) {
                                uploaderName = uploaderElement5.textContent.trim();
                            } else if (uploaderElement6) {
                                uploaderName = uploaderElement6.textContent.trim();
                            } else if (uploaderElement7) {
                                uploaderName = uploaderElement7.textContent.trim();
                            } else if (uploaderElement8) {
                                uploaderName = uploaderElement8.textContent.trim();
                            } else if (uploaderElement9) {
                                uploaderName = uploaderElement9.textContent.trim();
                            } else if (uploaderElement10) {
                                uploaderName = uploaderElement10.textContent.trim();
                            } else if (uploaderElement11) {
                                uploaderName = uploaderElement11.textContent.trim();
                            } else if (uploaderElement12) {
                                uploaderName = uploaderElement12.textContent.trim();
                            } else if (uploaderElement13) {
                                uploaderName = uploaderElement13.textContent.trim();
                            } else if (uploaderElement14) {
                                uploaderName = uploaderElement14.textContent.trim();
                            } else if (uploaderElement15) {
                                uploaderName = uploaderElement15.textContent.trim();
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
        modeOption1.textContent = 'Mode 1 (Include)';
        modeOption1.value = 'mode1';
        const modeOption2 = document.createElement('option');
        modeOption2.textContent = 'Mode 2 (Exclude)';
        modeOption2.value = 'mode2';
        const modeOption3 = document.createElement('option');
        modeOption3.textContent = 'Mode 3 (Include Uploader, Ignore Name)';
        modeOption3.value = 'mode3';
        const modeOption4 = document.createElement('option');
        modeOption4.textContent = 'Mode 4 (Exclude Uploader, Ignore Name)';
        modeOption4.value = 'mode4';
        modeSelect.appendChild(modeOption1);
        modeSelect.appendChild(modeOption2);
        modeSelect.appendChild(modeOption3);
        modeSelect.appendChild(modeOption4);

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
